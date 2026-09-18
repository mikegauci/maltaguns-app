import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { describe, it } from 'node:test'
import {
  buildProfileUpdateFromDidit,
  canonicaliseWebhookPayload,
  extractIdentityDetails,
  extractReviewNotes,
  hasIdentityVerificationDecision,
  isDiditVerificationUrl,
  isIdentityPendingReview,
  isProfileUserId,
  isWebhookTimestampFresh,
  resolveWebhookEventId,
  shouldApplyWebhookForSession,
  verifyWebhookSignature,
} from './didit.ts'

describe('isDiditVerificationUrl', () => {
  it('accepts verify.didit.me session URLs', () => {
    assert.equal(
      isDiditVerificationUrl('https://verify.didit.me/en/session/D8YcOBalmUag'),
      true
    )
  })

  it('rejects other origins', () => {
    assert.equal(isDiditVerificationUrl('https://vercel.com/login'), false)
    assert.equal(isDiditVerificationUrl(null), false)
  })
})

describe('resolveWebhookEventId', () => {
  it('uses event_id when present', () => {
    assert.equal(
      resolveWebhookEventId({
        event_id: 'evt-1',
        session_id: 'sess-1',
        status: 'Approved',
      }),
      'evt-1'
    )
  })

  it('falls back to session, type, and timestamp', () => {
    assert.equal(
      resolveWebhookEventId({
        session_id: 'sess-1',
        webhook_type: 'status.updated',
        timestamp: 123,
        status: 'Approved',
      }),
      'sess-1:status.updated:123'
    )
  })
})

describe('isProfileUserId', () => {
  it('accepts valid UUIDs', () => {
    assert.equal(isProfileUserId('dce05b89-8f0d-4299-8628-15bf63d3f3d1'), true)
  })

  it('rejects placeholders', () => {
    assert.equal(isProfileUserId('your-vendor-reference-id'), false)
  })
})

describe('extractReviewNotes', () => {
  it('collects warning descriptions from feature arrays', () => {
    assert.deepEqual(
      extractReviewNotes({
        id_verifications: [
          {
            warnings: [
              {
                short_description:
                  'Date of birth mismatch with provided information',
              },
            ],
          },
        ],
      }),
      ['Date of birth mismatch with provided information']
    )
  })
})

describe('isIdentityPendingReview', () => {
  it('treats In Review as pending', () => {
    assert.equal(isIdentityPendingReview(false, 'In Review'), true)
    assert.equal(isIdentityPendingReview(true, 'In Review'), false)
  })
})

describe('buildProfileUpdateFromDidit', () => {
  it('stores review notes for In Review', () => {
    assert.deepEqual(
      buildProfileUpdateFromDidit('In Review', {
        id_verifications: [
          {
            warnings: [{ short_description: 'Needs manual review' }],
          },
        ],
      }),
      {
        identity_status: 'In Review',
        identity_verified: false,
        identity_review_notes: ['Needs manual review'],
      }
    )
  })
})

describe('identity decision helpers', () => {
  it('extracts document holder name', () => {
    assert.deepEqual(
      extractIdentityDetails({
        id_verifications: [
          {
            first_name: 'John',
            last_name: 'Doe',
            document_type: 'Identity Card',
          },
        ],
      }),
      {
        firstName: 'John',
        lastName: 'Doe',
        documentType: 'Identity Card',
      }
    )
  })

  it('requires both names for approval', () => {
    assert.equal(
      hasIdentityVerificationDecision({
        id_verifications: [{ first_name: 'John', last_name: 'Doe' }],
      }),
      true
    )
    assert.equal(
      hasIdentityVerificationDecision({
        id_verifications: [{ first_name: 'John' }],
      }),
      false
    )
  })
})

describe('shouldApplyWebhookForSession', () => {
  it('accepts matching sessions', () => {
    assert.equal(shouldApplyWebhookForSession('sess-a', 'sess-a'), true)
  })

  it('rejects stale sessions when profile has an active session', () => {
    assert.equal(shouldApplyWebhookForSession('sess-b', 'sess-a'), false)
  })

  it('allows first webhook when profile has no stored session', () => {
    assert.equal(shouldApplyWebhookForSession(null, 'sess-a'), true)
  })
})

describe('webhook signature', () => {
  it('verifies canonical payload signatures', () => {
    const secret = 'test-secret'
    process.env.DIDIT_WEBHOOK_SECRET = secret
    const payload = {
      session_id: 'sess-1',
      status: 'Approved',
      timestamp: 1_641_038_400,
      vendor_data: 'dce05b89-8f0d-4299-8628-15bf63d3f3d1',
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(canonicaliseWebhookPayload(payload), 'utf8')
      .digest('hex')

    assert.equal(verifyWebhookSignature(payload, expected), true)
    assert.equal(verifyWebhookSignature(payload, 'bad-signature'), false)
    delete process.env.DIDIT_WEBHOOK_SECRET
  })
})

describe('isWebhookTimestampFresh', () => {
  it('accepts recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000)
    assert.equal(isWebhookTimestampFresh(now), true)
  })

  it('rejects stale timestamps', () => {
    const stale = Math.floor(Date.now() / 1000) - 600
    assert.equal(isWebhookTimestampFresh(stale), false)
  })
})
