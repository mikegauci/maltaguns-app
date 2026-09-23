import type { Json } from '@/lib/database.types'

export type ArmoryAccountStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED'
export type ArmoryStaffRole = 'owner' | 'staff'
export type ShippingAllocationMethod =
  'EVEN_SPLIT' | 'FIREARMS_ONLY_EVEN' | 'VALUE_WEIGHTED'

export type ShipmentStatus =
  | 'PRE_ORDER'
  | 'PERMIT_APPLIED'
  | 'PERMIT_REJECTED'
  | 'SHIPPED'
  | 'ARRIVED'
  | 'PROCESSING'
  | 'READY_FOR_COLLECTION'
  | 'CLOSED'

export type ItemType = 'FIREARM' | 'REGULATED_COMPONENT' | 'ACCESSORY'
export type ItemStatus =
  'AVAILABLE' | 'RESERVED' | 'PENDING_TRANSFER' | 'TRANSFERRED' | 'REJECTED'
export type HolderType = 'DEALER_STOCK' | 'BUYER'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type DocType = 'PRIOR_CONSENT' | 'TRANSFER_PROFORMA'
export type GenerationMethod = 'AUTO_FILLED' | 'BLANK_MANUAL'
export type NoteEntityType = 'SHIPMENT' | 'ITEM'

export type DealerAccountRow = {
  id: string
  owner_id: string
  company_name: string
  contact_surname: string | null
  contact_first_names: string | null
  contact_date_of_birth: string | null
  contact_place_of_birth: string | null
  passport_id_number: string | null
  passport_issue_date: string | null
  passport_issuing_authority: string | null
  registered_address: string | null
  phone_number: string | null
  fax_number: string | null
  email: string | null
  shipping_allocation_method: ShippingAllocationMethod
  dealer_licence_number: string | null
  dealer_licence_expiry: string | null
  account_status: 'pending' | 'approved' | 'suspended'
  approved_at: string | null
  approved_by: string | null
  status_note: string | null
  default_handling_fee_rifle: string | number | null
  default_handling_fee_pistol: string | number | null
  import_column_mapping: Json | null
  created_at: string
  updated_at: string
}

export type DealerAccount = {
  id: string
  ownerId: string
  companyName: string
  contactSurname: string | null
  contactFirstNames: string | null
  contactDateOfBirth: string | null
  contactPlaceOfBirth: string | null
  passportIdNumber: string | null
  passportIssueDate: string | null
  passportIssuingAuthority: string | null
  registeredAddress: string | null
  phoneNumber: string | null
  faxNumber: string | null
  email: string | null
  shippingAllocationMethod: ShippingAllocationMethod
  dealerLicenceNumber: string | null
  dealerLicenceExpiry: string | null
  accountStatus: ArmoryAccountStatus
  approvedAt: string | null
  approvedBy: string | null
  statusNote: string | null
  defaultHandlingFeeRifle: number | null
  defaultHandlingFeePistol: number | null
  importColumnMapping: string | null
  createdAt: string
  updatedAt: string
}

export type ShipmentRowDb = {
  id: string
  dealer_account_id: string
  reference: string
  status: ShipmentStatus
  sender_type: string | null
  sender_surname: string | null
  sender_first_names: string | null
  sender_date_of_birth: string | null
  sender_place_of_birth: string | null
  sender_passport_id: string | null
  sender_issue_date: string | null
  sender_issuing_authority: string | null
  sender_company_name: string | null
  sender_registered_office: string | null
  sender_address: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_fax: string | null
  prior_consent_ref: string | null
  prior_consent_date: string | null
  permit_applied_at: string | null
  permit_rejected_reason: string | null
  export_authorisation_ref: string | null
  export_authorisation_date: string | null
  carrier: string | null
  transit_countries: string | null
  delivery_address: string | null
  shipped_at: string | null
  arrived_at: string | null
  ready_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ShipmentRow = {
  id: string
  dealerAccountId: string
  reference: string
  status: ShipmentStatus
  senderType: string | null
  senderSurname: string | null
  senderFirstNames: string | null
  senderDateOfBirth: string | null
  senderPlaceOfBirth: string | null
  senderPassportId: string | null
  senderIssueDate: string | null
  senderIssuingAuthority: string | null
  senderCompanyName: string | null
  senderRegisteredOffice: string | null
  senderAddress: string | null
  senderCountry: string | null
  senderPhone: string | null
  senderFax: string | null
  priorConsentRef: string | null
  priorConsentDate: string | null
  permitAppliedAt: string | null
  permitRejectedReason: string | null
  exportAuthorisationRef: string | null
  exportAuthorisationDate: string | null
  carrier: string | null
  transitCountries: string | null
  deliveryAddress: string | null
  shippedAt: string | null
  arrivedAt: string | null
  readyAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ItemRowDb = {
  id: string
  dealer_account_id: string
  shipment_id: string | null
  item_type: ItemType
  category: string | null
  type_description: string | null
  make: string | null
  model: string | null
  quantity: number
  serial_number: string | null
  calibre_raw: string | null
  calibre_display: string | null
  gauge: string | null
  country_of_manufacture: string | null
  year_of_manufacture: string | null
  loading: string | null
  barrel_type: string | null
  hammer_type: string | null
  sights_type: string | null
  capacity: number | null
  fire_mode: string
  cip_proof: boolean | null
  schedule_proforma: string | null
  schedule_import_doc: string | null
  schedule_overridden: boolean
  schedule_override_reason: string | null
  eu_category: string | null
  deactivated: boolean
  deactivation_cert_ref: string | null
  original_seller: string | null
  egun_listing_id: string | null
  egun_listing_url: string | null
  description_raw: string | null
  description_en: string | null
  acquisition_price: string | number | null
  egun_domestic_shipping_fee: string | number | null
  current_holder_type: HolderType
  current_holder_buyer_id: string | null
  status: ItemStatus
  sale_price: string | number | null
  client_handling_fee: string | number | null
  payment_status: PaymentStatus
  amount_paid: string | number | null
  date_paid: string | null
  transfer_doc_printed_at: string | null
  transferred_at: string | null
  commissioner_notified_at: string | null
  collected_at: string | null
  buyer_licence_type: string | null
  buyer_licence_number: string | null
  other_features: string | null
  notes: string | null
  on_hold: boolean
  on_hold_reason: string | null
  deleted_at: string | null
  proforma_loading: string | null
  proforma_barrel_hammer: string | null
  schedule_line_item_code: string | null
  import_batch_id: string | null
  created_at: string
  updated_at: string
}

export type ItemRow = {
  id: string
  dealerAccountId: string
  shipmentId: string | null
  itemType: ItemType
  category: string | null
  typeDescription: string | null
  make: string | null
  model: string | null
  quantity: number
  serialNumber: string | null
  calibreRaw: string | null
  calibreDisplay: string | null
  gauge: string | null
  countryOfManufacture: string | null
  yearOfManufacture: string | null
  loading: string | null
  barrelType: string | null
  hammerType: string | null
  sightsType: string | null
  capacity: number | null
  fireMode: string
  cipProof: boolean | null
  scheduleProforma: string | null
  scheduleImportDoc: string | null
  scheduleOverridden: boolean
  scheduleOverrideReason: string | null
  euCategory: string | null
  deactivated: boolean
  deactivationCertRef: string | null
  originalSeller: string | null
  egunListingId: string | null
  egunListingUrl: string | null
  descriptionRaw: string | null
  descriptionEn: string | null
  acquisitionPrice: number | null
  egunDomesticShippingFee: number | null
  currentHolderType: HolderType
  currentHolderBuyerId: string | null
  status: ItemStatus
  salePrice: number | null
  clientHandlingFee: number | null
  paymentStatus: PaymentStatus
  amountPaid: number | null
  datePaid: string | null
  transferDocPrintedAt: string | null
  transferredAt: string | null
  commissionerNotifiedAt: string | null
  collectedAt: string | null
  buyerLicenceType: string | null
  buyerLicenceNumber: string | null
  otherFeatures: string | null
  notes: string | null
  onHold: boolean
  onHoldReason: string | null
  deletedAt: string | null
  proformaLoading: string | null
  proformaBarrelHammer: string | null
  scheduleLineItemCode: string | null
  importBatchId: string | null
  createdAt: string
  updatedAt: string
  buyerName?: string | null
  shipmentReference?: string | null
  shipmentArrivedAt?: string | null
}

export type BuyerRowDb = {
  id: string
  dealer_account_id: string
  surname: string
  first_names: string
  licence_type: string | null
  licence_number: string | null
  passport_id_number: string | null
  phone_number: string | null
  whatsapp_opt_in: boolean
  sms_opt_in: boolean
  email: string | null
  address: string | null
  nickname: string | null
  notes: string | null
  anonymised_at: string | null
  created_at: string
}

export type NotificationRowDb = {
  id: string
  dealer_account_id: string
  buyer_id: string
  shipment_id: string | null
  inventory_item_id: string | null
  trigger_type: string
  channel: string
  message_content: string | null
  delivery_status: string
  provider_ref: string | null
  error: string | null
  sent_at: string | null
  created_at: string
}

export type NotificationRow = {
  id: string
  buyerId: string
  shipmentId: string | null
  trigger: string
  channel: string
  messageContent: string | null
  deliveryStatus: string
  sentAt: string | null
  providerRef: string | null
  error: string | null
  createdAt: string
  buyerName?: string | null
}

export type AuditLogRowDb = {
  id: string
  profile_id: string | null
  dealer_account_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Json | null
  ip: string | null
  created_at: string
}

export type AuditLogRow = {
  id: string
  profileId: string | null
  dealerAccountId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  details: string | null
  ip: string | null
  createdAt: string
  userEmail?: string | null
  dealerName?: string | null
}

export type BuyerRow = {
  id: string
  dealerAccountId: string
  surname: string
  firstNames: string
  licenceType: string | null
  licenceNumber: string | null
  passportIdNumber: string | null
  phoneNumber: string | null
  whatsappOptIn: boolean
  smsOptIn: boolean
  email: string | null
  address: string | null
  nickname: string | null
  notes: string | null
  anonymisedAt: string | null
  createdAt: string
}

export type QuoteRowDb = {
  id: string
  shipment_id: string
  carrier_name: string
  quoted_amount: string | number
  quote_date: string | null
  status: string
  source: string
  notes: string | null
  created_at: string
}

export type QuoteRow = {
  id: string
  shipmentId: string
  carrierName: string
  quotedAmount: number
  quoteDate: string | null
  status: string
  source: string
  notes: string | null
  createdAt: string
}

export type CostRowDb = {
  id: string
  shipment_id: string
  label: string
  amount: string | number
  cost_date: string | null
  notes: string | null
  created_at: string
}

export type CostRow = {
  id: string
  shipmentId: string
  label: string
  amount: number
  date: string | null
  notes: string | null
  createdAt: string
}

export type DocumentRowDb = {
  id: string
  dealer_account_id: string
  shipment_id: string | null
  inventory_item_id: string | null
  doc_type: DocType
  generation_method: GenerationMethod
  version: number
  data_snapshot: Json
  missing_fields_at_print: Json | null
  created_by: string | null
  created_at: string
}

export type DocumentRow = {
  id: string
  dealerAccountId: string
  shipmentId: string | null
  inventoryItemId: string | null
  docType: DocType
  generationMethod: GenerationMethod
  version: number
  dataSnapshot: string
  missingFieldsAtPrint: string | null
  createdAt: string
  createdByUserId: string | null
}

export type OwnershipEventRowDb = {
  id: string
  inventory_item_id: string
  event_type: string
  from_label: string
  to_label: string
  buyer_id: string | null
  event_date: string
  document_id: string | null
}

export type OwnershipEventRow = {
  id: string
  inventoryItemId: string
  eventType: string
  fromLabel: string
  toLabel: string
  buyerId: string | null
  date: string
  documentId: string | null
}

export type NoteRowDb = {
  id: string
  dealer_account_id: string
  entity_type: NoteEntityType
  entity_id: string
  body: string
  created_by: string | null
  created_by_label: string | null
  created_at: string
}

export type NoteRow = {
  id: string
  dealerAccountId: string
  entityType: NoteEntityType
  entityId: string
  body: string
  createdByUserId: string | null
  createdByLabel: string | null
  createdAt: string
}

export type StaffRowDb = {
  id: string
  profile_id: string
  dealer_account_id: string
  role: ArmoryStaffRole
  name: string | null
  disabled_at: string | null
  created_at: string
}

export type StaffRow = {
  id: string
  profileId: string
  email: string | null
  name: string | null
  role: ArmoryStaffRole
  disabledAt: string | null
  createdAt: string
}

export type DashboardStats = {
  inStock: number
  reserved: number
  pending: number
  unpaid: number
}

export type CommissionerNoticeRow = {
  id: string
  make: string | null
  model: string | null
  serialNumber: string | null
  transferredAt: string | null
  buyerName: string | null
  daysSinceTransfer: number
}

function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function jsonToString(value: Json | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function mapAccountStatus(
  status: DealerAccountRow['account_status']
): ArmoryAccountStatus {
  return status.toUpperCase() as ArmoryAccountStatus
}

export function mapDealerAccount(row: DealerAccountRow): DealerAccount {
  return {
    id: row.id,
    ownerId: row.owner_id,
    companyName: row.company_name,
    contactSurname: row.contact_surname,
    contactFirstNames: row.contact_first_names,
    contactDateOfBirth: row.contact_date_of_birth,
    contactPlaceOfBirth: row.contact_place_of_birth,
    passportIdNumber: row.passport_id_number,
    passportIssueDate: row.passport_issue_date,
    passportIssuingAuthority: row.passport_issuing_authority,
    registeredAddress: row.registered_address,
    phoneNumber: row.phone_number,
    faxNumber: row.fax_number,
    email: row.email,
    shippingAllocationMethod: row.shipping_allocation_method,
    dealerLicenceNumber: row.dealer_licence_number,
    dealerLicenceExpiry: row.dealer_licence_expiry,
    accountStatus: mapAccountStatus(row.account_status),
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    statusNote: row.status_note,
    defaultHandlingFeeRifle: num(row.default_handling_fee_rifle),
    defaultHandlingFeePistol: num(row.default_handling_fee_pistol),
    importColumnMapping: jsonToString(row.import_column_mapping),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapShipment(row: ShipmentRowDb): ShipmentRow {
  return {
    id: row.id,
    dealerAccountId: row.dealer_account_id,
    reference: row.reference,
    status: row.status,
    senderType: row.sender_type,
    senderSurname: row.sender_surname,
    senderFirstNames: row.sender_first_names,
    senderDateOfBirth: row.sender_date_of_birth,
    senderPlaceOfBirth: row.sender_place_of_birth,
    senderPassportId: row.sender_passport_id,
    senderIssueDate: row.sender_issue_date,
    senderIssuingAuthority: row.sender_issuing_authority,
    senderCompanyName: row.sender_company_name,
    senderRegisteredOffice: row.sender_registered_office,
    senderAddress: row.sender_address,
    senderCountry: row.sender_country,
    senderPhone: row.sender_phone,
    senderFax: row.sender_fax,
    priorConsentRef: row.prior_consent_ref,
    priorConsentDate: row.prior_consent_date,
    permitAppliedAt: row.permit_applied_at,
    permitRejectedReason: row.permit_rejected_reason,
    exportAuthorisationRef: row.export_authorisation_ref,
    exportAuthorisationDate: row.export_authorisation_date,
    carrier: row.carrier,
    transitCountries: row.transit_countries,
    deliveryAddress: row.delivery_address,
    shippedAt: row.shipped_at,
    arrivedAt: row.arrived_at,
    readyAt: row.ready_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapItem(
  row: ItemRowDb,
  joins?: {
    buyer?: { first_names: string; surname: string } | null
    shipment?: { reference: string; arrived_at: string | null } | null
  }
): ItemRow {
  const buyer = joins?.buyer
  const shipment = joins?.shipment
  return {
    id: row.id,
    dealerAccountId: row.dealer_account_id,
    shipmentId: row.shipment_id,
    itemType: row.item_type,
    category: row.category,
    typeDescription: row.type_description,
    make: row.make,
    model: row.model,
    quantity: row.quantity,
    serialNumber: row.serial_number,
    calibreRaw: row.calibre_raw,
    calibreDisplay: row.calibre_display,
    gauge: row.gauge,
    countryOfManufacture: row.country_of_manufacture,
    yearOfManufacture: row.year_of_manufacture,
    loading: row.loading,
    barrelType: row.barrel_type,
    hammerType: row.hammer_type,
    sightsType: row.sights_type,
    capacity: row.capacity,
    fireMode: row.fire_mode,
    cipProof: row.cip_proof,
    scheduleProforma: row.schedule_proforma,
    scheduleImportDoc: row.schedule_import_doc,
    scheduleOverridden: row.schedule_overridden,
    scheduleOverrideReason: row.schedule_override_reason,
    euCategory: row.eu_category,
    deactivated: row.deactivated,
    deactivationCertRef: row.deactivation_cert_ref,
    originalSeller: row.original_seller,
    egunListingId: row.egun_listing_id,
    egunListingUrl: row.egun_listing_url,
    descriptionRaw: row.description_raw,
    descriptionEn: row.description_en,
    acquisitionPrice: num(row.acquisition_price),
    egunDomesticShippingFee: num(row.egun_domestic_shipping_fee),
    currentHolderType: row.current_holder_type,
    currentHolderBuyerId: row.current_holder_buyer_id,
    status: row.status,
    salePrice: num(row.sale_price),
    clientHandlingFee: num(row.client_handling_fee),
    paymentStatus: row.payment_status,
    amountPaid: num(row.amount_paid),
    datePaid: row.date_paid,
    transferDocPrintedAt: row.transfer_doc_printed_at,
    transferredAt: row.transferred_at,
    commissionerNotifiedAt: row.commissioner_notified_at,
    collectedAt: row.collected_at,
    buyerLicenceType: row.buyer_licence_type,
    buyerLicenceNumber: row.buyer_licence_number,
    otherFeatures: row.other_features,
    notes: row.notes,
    onHold: row.on_hold,
    onHoldReason: row.on_hold_reason,
    deletedAt: row.deleted_at,
    proformaLoading: row.proforma_loading,
    proformaBarrelHammer: row.proforma_barrel_hammer,
    scheduleLineItemCode: row.schedule_line_item_code,
    importBatchId: row.import_batch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    buyerName: buyer ? `${buyer.first_names} ${buyer.surname}` : null,
    shipmentReference: shipment?.reference ?? null,
    shipmentArrivedAt: shipment?.arrived_at ?? null,
  }
}

export function mapBuyer(row: BuyerRowDb): BuyerRow {
  return {
    id: row.id,
    dealerAccountId: row.dealer_account_id,
    surname: row.surname,
    firstNames: row.first_names,
    licenceType: row.licence_type,
    licenceNumber: row.licence_number,
    passportIdNumber: row.passport_id_number,
    phoneNumber: row.phone_number,
    whatsappOptIn: row.whatsapp_opt_in,
    smsOptIn: row.sms_opt_in,
    email: row.email,
    address: row.address,
    nickname: row.nickname,
    notes: row.notes,
    anonymisedAt: row.anonymised_at,
    createdAt: row.created_at,
  }
}

export function mapQuote(row: QuoteRowDb): QuoteRow {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    carrierName: row.carrier_name,
    quotedAmount: num(row.quoted_amount) ?? 0,
    quoteDate: row.quote_date,
    status: row.status,
    source: row.source,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export function mapCost(row: CostRowDb): CostRow {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    label: row.label,
    amount: num(row.amount) ?? 0,
    date: row.cost_date,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export function mapDocument(row: DocumentRowDb): DocumentRow {
  return {
    id: row.id,
    dealerAccountId: row.dealer_account_id,
    shipmentId: row.shipment_id,
    inventoryItemId: row.inventory_item_id,
    docType: row.doc_type,
    generationMethod: row.generation_method,
    version: row.version,
    dataSnapshot: jsonToString(row.data_snapshot) ?? '{}',
    missingFieldsAtPrint: jsonToString(row.missing_fields_at_print),
    createdAt: row.created_at,
    createdByUserId: row.created_by,
  }
}

export function mapOwnershipEvent(row: OwnershipEventRowDb): OwnershipEventRow {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    eventType: row.event_type,
    fromLabel: row.from_label,
    toLabel: row.to_label,
    buyerId: row.buyer_id,
    date: row.event_date,
    documentId: row.document_id,
  }
}

export function mapNote(row: NoteRowDb): NoteRow {
  return {
    id: row.id,
    dealerAccountId: row.dealer_account_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    body: row.body,
    createdByUserId: row.created_by,
    createdByLabel: row.created_by_label,
    createdAt: row.created_at,
  }
}

export function mapStaff(row: StaffRowDb, email: string | null): StaffRow {
  return {
    id: row.id,
    profileId: row.profile_id,
    email,
    name: row.name,
    role: row.role,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
  }
}
