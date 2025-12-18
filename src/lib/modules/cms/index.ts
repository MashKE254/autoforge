/**
 * CMS Module
 *
 * Provides content management with rich text editing, media library, and versioning
 */

export interface CMSModuleConfig {
  features?: Array<'rich-text' | 'media-library' | 'versioning' | 'seo' | 'scheduling' | 'multi-language'>;
}

export interface CMSModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const prismaSchema = `model Post {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  content     String    // Rich text content (HTML or JSON)
  excerpt     String?
  coverImage  String?
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  authorId    String
  categoryId  String?
  tags        String[]

  // SEO
  metaTitle       String?
  metaDescription String?
  metaKeywords    String[]

  // Versioning
  version     Int       @default(1)
  previousVersionId String?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  category    Category? @relation(fields: [categoryId], references: [id])
  versions    PostVersion[]
  comments    Comment[]

  @@index([slug])
  @@index([status])
  @@index([authorId])
  @@index([publishedAt])
}

model PostVersion {
  id        String   @id @default(cuid())
  postId    String
  version   Int
  title     String
  content   String
  createdAt DateTime @default(now())
  createdBy String

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
}

model Category {
  id          String  @id @default(cuid())
  name        String  @unique
  slug        String  @unique
  description String?
  parentId    String?
  posts       Post[]

  @@index([slug])
}

model Media {
  id        String    @id @default(cuid())
  filename  String
  url       String
  mimeType  String
  size      Int       // in bytes
  width     Int?
  height    Int?
  alt       String?
  caption   String?
  uploadedBy String
  createdAt DateTime  @default(now())

  @@index([uploadedBy])
  @@index([mimeType])
}

model Comment {
  id        String   @id @default(cuid())
  postId    String
  authorName String
  authorEmail String
  content   String
  approved  Boolean  @default(false)
  createdAt DateTime @default(now())

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([approved])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  SCHEDULED
}
`;

const richTextEditor = `'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex gap-2 p-2 border-b bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('bold') ? 'bg-gray-200' : ''}\`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('italic') ? 'bg-gray-200' : ''}\`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}\`}
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}\`}
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('bulletList') ? 'bg-gray-200' : ''}\`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('orderedList') ? 'bg-gray-200' : ''}\`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={\`p-2 rounded hover:bg-gray-200 \${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}\`}
        >
          <Code className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} className="prose max-w-none p-4" />
    </div>
  );
}
`;

const mediaLibrary = `'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, X, Search } from 'lucide-react';

interface Media {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export function MediaLibrary({ onSelect }: { onSelect: (media: Media) => void }) {
  const [media, setMedia] = useState<Media[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  async function fetchMedia() {
    const res = await fetch('/api/media');
    const data = await res.json();
    setMedia(data);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
    }

    await fetchMedia();
    setUploading(false);
  }

  const filteredMedia = media.filter(m =>
    m.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {uploading && <div>Uploading...</div>}

      <div className="grid grid-cols-4 gap-4">
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 cursor-pointer"
          >
            {item.mimeType.startsWith('image/') ? (
              <Image src={item.url} alt={item.filename} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                {item.mimeType}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
`;

export function generateCMSModule(config: CMSModuleConfig): CMSModuleOutput {
  const files = [
    { path: 'prisma/schema-cms.prisma', content: prismaSchema },
    { path: 'components/cms/rich-text-editor.tsx', content: richTextEditor },
    { path: 'components/cms/media-library.tsx', content: mediaLibrary },
  ];

  const dependencies = [
    '@tiptap/react',
    '@tiptap/starter-kit',
    '@tiptap/extension-placeholder',
    '@tiptap/pm',
    'sharp',
  ];

  const instructions = [
    'Run: npx prisma db push to create CMS tables',
    'Configure file upload storage (Supabase or S3)',
    'Set up slug generation for posts',
    'Customize TipTap editor extensions as needed',
  ];

  return {
    files,
    envVars: [],
    dependencies,
    instructions,
  };
}

export function getCMSModulePrompt(config: CMSModuleConfig): string {
  return `## CMS Module\n\nFeatures: ${config.features?.join(', ') || 'rich-text, media-library, versioning'}\n\nIncludes rich text editor (TipTap), media library, post versioning, and SEO management.`;
}
