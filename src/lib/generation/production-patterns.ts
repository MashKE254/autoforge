/**
 * PRODUCTION PATTERNS LIBRARY
 *
 * Real-world patterns that MUST be implemented in production apps
 * but are typically missing from AI-generated prototypes.
 *
 * This is what makes AutoForge generate COMPLETE apps, not prototypes.
 */

export const PRODUCTION_PATTERNS = `
## 🎯 CRITICAL: PRODUCTION-GRADE PATTERNS (NOT PROTOTYPES!)

AutoForge generates COMPLETE, PRODUCTION-READY applications. Follow these patterns religiously.

### 1. DATA TABLES - COMPLETE IMPLEMENTATION REQUIRED

For ANY table or list of data, you MUST implement ALL of these:

#### ✅ Pagination (REQUIRED)
\`\`\`tsx
// Server-side with proper limits
const page = parseInt(searchParams.page || '1');
const limit = 20;
const offset = (page - 1) * limit;

const { data, error, count } = await supabase
  .from('items')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false });

const totalPages = Math.ceil((count || 0) / limit);

// Client-side pagination controls
<div className="flex justify-between items-center mt-4">
  <Button disabled={page === 1} onClick={() => router.push(\`?page=\${page - 1}\`)}>
    Previous
  </Button>
  <span>Page {page} of {totalPages}</span>
  <Button disabled={page === totalPages} onClick={() => router.push(\`?page=\${page + 1}\`)}>
    Next
  </Button>
</div>
\`\`\`

#### ✅ Search (REQUIRED)
\`\`\`tsx
// Debounced search input (client)
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to page 1 on search
    router.push(\`?\${params.toString()}\`);
  }, 300);

  return (
    <input
      type="text"
      placeholder="Search..."
      defaultValue={searchParams.get('search') || ''}
      onChange={(e) => handleSearch(e.target.value)}
      className="..."
    />
  );
}

// Server-side filtering
const search = searchParams.search || '';
let query = supabase.from('items').select('*');

if (search) {
  query = query.or(\`name.ilike.%\${search}%,description.ilike.%\${search}%\`);
}
\`\`\`

#### ✅ Sorting (REQUIRED)
\`\`\`tsx
// Sortable column headers
const sort = searchParams.sort || 'created_at';
const order = searchParams.order || 'desc';

const { data } = await supabase
  .from('items')
  .select('*')
  .order(sort, { ascending: order === 'asc' });

// Column header component
function SortableHeader({ column, label }: { column: string; label: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort');
  const currentOrder = searchParams.get('order');

  const handleSort = () => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', column);
    params.set('order', currentSort === column && currentOrder === 'asc' ? 'desc' : 'asc');
    router.push(\`?\${params.toString()}\`);
  };

  return (
    <th onClick={handleSort} className="cursor-pointer hover:bg-white/5">
      {label}
      {currentSort === column && (currentOrder === 'asc' ? ' ↑' : ' ↓')}
    </th>
  );
}
\`\`\`

#### ✅ Filters (REQUIRED for complex tables)
\`\`\`tsx
// Multi-select filters
const status = searchParams.status?.split(',') || [];
const category = searchParams.category || '';

let query = supabase.from('items').select('*');

if (status.length > 0) {
  query = query.in('status', status);
}

if (category) {
  query = query.eq('category', category);
}

// Filter UI
<select
  value={category}
  onChange={(e) => {
    const params = new URLSearchParams(searchParams);
    params.set('category', e.target.value);
    params.set('page', '1');
    router.push(\`?\${params.toString()}\`);
  }}
>
  <option value="">All Categories</option>
  <option value="tech">Tech</option>
  <option value="design">Design</option>
</select>
\`\`\`

#### ✅ Loading States (REQUIRED)
\`\`\`tsx
// loading.tsx file for every data page
export default function Loading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 bg-white/5 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
\`\`\`

#### ✅ Empty States (REQUIRED)
\`\`\`tsx
if (!data || data.length === 0) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-400 mb-4">No items found</p>
      <Button onClick={() => router.push('/items/new')}>
        Create your first item
      </Button>
    </div>
  );
}
\`\`\`

---

### 2. FORMS - COMPLETE IMPLEMENTATION REQUIRED

For EVERY form, you MUST implement:

#### ✅ Validation with Zod + react-hook-form
\`\`\`tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').optional(),
});

type CreateItemInput = z.infer<typeof createItemSchema>;

export function CreateItemForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
  });

  const onSubmit = async (data: CreateItemInput) => {
    try {
      const result = await createItem(data);
      if (result.success) {
        toast.success('Item created!');
        router.push('/items');
      } else {
        toast.error(result.error || 'Failed to create item');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Name</label>
        <input
          {...register('name')}
          className="..."
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Item'}
      </Button>
    </form>
  );
}
\`\`\`

#### ✅ Server Actions with Validation
\`\`\`tsx
'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const createItemSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
});

export async function createItem(input: unknown) {
  try {
    // 1. Auth check
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Validate input
    const validated = createItemSchema.parse(input);

    // 3. Database operation
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('items')
      .insert({
        ...validated,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Revalidate cache
    revalidatePath('/items');

    return { success: true, data };
  } catch (error) {
    console.error('Create item failed:', error);

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: 'Failed to create item' };
  }
}
\`\`\`

---

### 3. ERROR HANDLING - REQUIRED EVERYWHERE

#### ✅ Error Boundaries
\`\`\`tsx
// app/dashboard/error.tsx (for every major section)
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-xl font-semibold mb-4">Something went wrong!</h2>
      <p className="text-gray-400 mb-6">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
\`\`\`

#### ✅ API Error Handling
\`\`\`tsx
// app/api/items/route.ts
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
\`\`\`

---

### 4. OPTIMISTIC UPDATES - REQUIRED FOR INTERACTIVE FEATURES

\`\`\`tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function TodoItem({ todo }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(\`/api/todos/\${id}/toggle\`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to toggle');
      return response.json();
    },
    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData(['todos']);

      queryClient.setQueryData(['todos'], (old: any[]) =>
        old.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );

      return { previousTodos };
    },
    // Rollback on error
    onError: (err, id, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
      toast.error('Failed to update todo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleMutation.mutate(todo.id)}
      />
      {todo.title}
    </div>
  );
}
\`\`\`

---

### 5. REAL-TIME FEATURES - REQUIRED FOR COLLABORATIVE APPS

\`\`\`tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RealtimeItems() {
  const [items, setItems] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchItems = async () => {
      const { data } = await supabase.from('items').select('*');
      setItems(data || []);
    };
    fetchItems();

    // Subscribe to changes
    const channel = supabase
      .channel('items-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <div>{/* render items */}</div>;
}
\`\`\`

---

### 6. AUTHENTICATION PATTERNS - COMPLETE IMPLEMENTATION

#### ✅ Protected Routes (middleware.ts)
\`\`\`tsx
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
\`\`\`

#### ✅ User Data Sync (Clerk webhook)
\`\`\`tsx
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  const evt = wh.verify(body, {
    'svix-id': svix_id!,
    'svix-timestamp': svix_timestamp!,
    'svix-signature': svix_signature!,
  });

  const { id, email_addresses, first_name, last_name } = evt.data;
  const email = email_addresses[0]?.email_address;

  if (evt.type === 'user.created') {
    const supabase = await createClient();
    await supabase.from('users').insert({
      clerk_id: id,
      email,
      first_name,
      last_name,
      created_at: new Date().toISOString(),
    });
  }

  return new Response('Webhook processed', { status: 200 });
}
\`\`\`

---

### 7. ANALYTICS & MONITORING - PRODUCTION REQUIREMENT

\`\`\`tsx
// lib/analytics.ts
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
}

// In components
trackEvent('item_created', { category: 'productivity' });
trackEvent('checkout_completed', { value: total, currency: 'USD' });
\`\`\`

---

### 8. DATABASE SCHEMAS - COMPLETE WITH INDEXES

\`\`\`sql
-- lib/db/schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (synced from Clerk)
create table users (
  id uuid primary key default uuid_generate_v4(),
  clerk_id text unique not null,
  email text unique not null,
  first_name text,
  last_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index users_clerk_id_idx on users(clerk_id);
create index users_email_idx on users(email);

-- Items table with proper indexes
create table items (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  name text not null,
  description text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index items_user_id_idx on items(user_id);
create index items_status_idx on items(status);
create index items_created_at_idx on items(created_at desc);

-- Enable Row Level Security
alter table items enable row level security;

-- RLS Policies
create policy "Users can view their own items"
  on items for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can create their own items"
  on items for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update their own items"
  on items for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
\`\`\`

---

## ⚠️ ABSOLUTE REQUIREMENTS - NO EXCEPTIONS

1. **NO TODO COMMENTS** - Every feature must be fully implemented
2. **NO PLACEHOLDER DATA** - All data comes from database or APIs
3. **NO MOCK FUNCTIONS** - Every function must work end-to-end
4. **COMPLETE ERROR HANDLING** - Every async operation has try-catch
5. **LOADING STATES EVERYWHERE** - Every page/component shows loading
6. **VALIDATION ON ALL FORMS** - Zod + react-hook-form required
7. **PROPER TYPES** - No 'any' types, full TypeScript strict mode
8. **DATABASE INDEXES** - All frequently queried columns indexed
9. **RLS POLICIES** - Supabase tables have proper security policies
10. **RESPONSIVE DESIGN** - Mobile, tablet, desktop all work perfectly

---

## 🎯 THE AUTOFORGE STANDARD

Remember: We're building PRODUCTION-GRADE applications that real companies use.

- NOT prototypes
- NOT MVPs that need editing
- NOT "good enough for now"

We build COMPLETE, POLISHED, PROFESSIONAL applications that:
- Deploy immediately to production
- Scale to thousands of users
- Pass security audits
- Delight users with polish and performance

**This is what makes AutoForge better than every competitor.**
`;
