'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { resizeImageForUpload } from '@/lib/image-resize'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Loader2,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react'
import { LinkDialog, ImageAltDialog } from '@/components/dialogs'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Database } from '@/lib/database.types'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

async function uploadContentImage(
  file: File,
  supabase: ReturnType<typeof createClientComponentClient<Database>>,
  userId: string
) {
  const resized = await resizeImageForUpload(file)
  const fileExt = resized.name.split('.').pop()
  const fileName = `${userId}-content-${Date.now()}-${Math.random()}.${fileExt}`
  const filePath = `blog/content/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('blog')
    .upload(filePath, resized, {
      cacheControl: '31536000',
      upsert: false,
      contentType: resized.type,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('blog').getPublicUrl(filePath)

  return publicUrl
}

type BlogEditorProps = {
  initialContent?: string
  onChange: (_html: string) => void
  autofocus?: boolean
  onUploadingChange?: (_uploading: boolean) => void
}

export default function BlogEditor({
  initialContent = '',
  onChange,
  autofocus = false,
  onUploadingChange,
}: BlogEditorProps) {
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [uploadingContentImage, setUploadingContentImage] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [openInNewTab, setOpenInNewTab] = useState(true)
  const [imageAltDialogOpen, setImageAltDialogOpen] = useState(false)
  const [imageAltText, setImageAltText] = useState('')
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [selectedImage, setSelectedImage] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [isEditingExistingImage, setIsEditingExistingImage] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-md',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    immediatelyRender: false,
    content: initialContent,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert prose-strong:text-foreground prose-b:text-foreground focus:outline-none min-h-[200px] text-foreground',
      },
      handleClick: (_view, _pos, event) => {
        const domEvent = event as MouseEvent
        const element = domEvent.target as HTMLElement

        if (element.tagName === 'IMG') {
          const img = element as HTMLImageElement
          setSelectedImage({
            src: img.src,
            alt: img.alt || '',
          })
          setImageAltText(img.alt || '')
          setIsEditingExistingImage(true)
          setImageAltDialogOpen(true)
          return true
        }
        return false
      },
    },
    autofocus,
  })

  useEffect(() => {
    if (editor && autofocus) {
      editor.commands.focus()
    }
  }, [editor, autofocus])

  useEffect(() => {
    onUploadingChange?.(uploadingContentImage)
  }, [uploadingContentImage, onUploadingChange])

  const addImage = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'

      input.onchange = async event => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return

        if (file.size > MAX_FILE_SIZE) {
          toast({
            variant: 'destructive',
            title: 'File too large',
            description: 'Image must be less than 5MB',
          })
          return
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            variant: 'destructive',
            title: 'Invalid file type',
            description:
              'Please upload a valid image file (JPEG, PNG, or WebP)',
          })
          return
        }

        setPendingImageFile(file)
        const altTextWithoutExtension = file.name.replace(/\.[^/.]+$/, '')
        setImageAltText(altTextWithoutExtension)
        setImageAltDialogOpen(true)
      }

      input.click()
    } catch (error) {
      console.error('Error adding image:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add image to post',
      })
    }
  }

  const handleImageInsert = async () => {
    if (!imageAltText) return

    if (isEditingExistingImage && selectedImage) {
      editor
        ?.chain()
        .focus()
        .setImage({
          src: selectedImage.src,
          alt: imageAltText,
        })
        .run()

      toast({
        title: 'Alt text updated',
        description: 'Image alt text has been updated successfully',
      })

      setImageAltDialogOpen(false)
      setImageAltText('')
      setSelectedImage(null)
      setIsEditingExistingImage(false)
      return
    }

    if (!pendingImageFile) return

    setUploadingContentImage(true)
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user.id) {
        throw new Error('Authentication error')
      }

      const imageUrl = await uploadContentImage(
        pendingImageFile,
        supabase,
        session.user.id
      )

      if (editor) {
        editor
          .chain()
          .focus()
          .setImage({ src: imageUrl, alt: imageAltText })
          .run()
      }

      toast({
        title: 'Image inserted',
        description: 'Your image has been added to the post',
      })

      setImageAltDialogOpen(false)
      setImageAltText('')
      setPendingImageFile(null)
      setIsEditingExistingImage(false)
    } catch (error) {
      console.error('Content image upload error:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload image',
      })
    } finally {
      setUploadingContentImage(false)
    }
  }

  const setLink = () => {
    if (!editor) return

    if (!editor.state.selection.empty) {
      setLinkDialogOpen(true)
    } else {
      toast({
        variant: 'destructive',
        title: 'No text selected',
        description: 'Please select some text to add a link.',
      })
    }
  }

  const applyLink = () => {
    if (!editor || !linkUrl) return

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: linkUrl,
        target: openInNewTab ? '_blank' : null,
      })
      .run()

    setLinkUrl('')
    setLinkDialogOpen(false)
  }

  const removeLink = () => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  return (
    <>
      <div className="min-h-[400px] border rounded-lg">
        {editor && (
          <div className="border rounded-lg p-2 mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-accent' : ''}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-accent' : ''}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={
                editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''
              }
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={
                editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''
              }
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'bg-accent' : ''}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addImage}
              disabled={uploadingContentImage}
            >
              {uploadingContentImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setLink}
              className={editor.isActive('link') ? 'bg-accent' : ''}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            {editor.isActive('link') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeLink}
                className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
              >
                <LinkIcon className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        )}
        <div className="p-4">
          <EditorContent editor={editor} />
        </div>
      </div>

      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        openInNewTab={openInNewTab}
        setOpenInNewTab={setOpenInNewTab}
        onApply={applyLink}
      />

      <ImageAltDialog
        open={imageAltDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setImageAltDialogOpen(false)
            setImageAltText('')
            setPendingImageFile(null)
            setSelectedImage(null)
            setIsEditingExistingImage(false)
          }
        }}
        imageAltText={imageAltText}
        setImageAltText={setImageAltText}
        isEditingExistingImage={isEditingExistingImage}
        selectedImage={selectedImage}
        uploadingContentImage={uploadingContentImage}
        onInsert={handleImageInsert}
        onCancel={() => {
          setPendingImageFile(null)
          setImageAltText('')
          setSelectedImage(null)
          setIsEditingExistingImage(false)
        }}
      />
    </>
  )
}
