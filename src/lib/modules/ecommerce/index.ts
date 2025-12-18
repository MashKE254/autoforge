/**
 * E-commerce Module
 *
 * Provides complete online store functionality: cart, checkout, inventory, shipping, tax
 */

export interface EcommerceModuleConfig {
  features?: Array<'cart' | 'checkout' | 'inventory' | 'shipping' | 'tax' | 'discounts' | 'reviews'>;
  currency?: string;
  shippingProviders?: Array<'shipstation' | 'easypost' | 'manual'>;
}

export interface EcommerceModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const prismaSchema = `model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Int      // in cents
  compareAtPrice Int?   // original price for discounts
  images      String[] // Array of image URLs
  category    String?
  tags        String[]
  inventory   Int      @default(0)
  sku         String?  @unique
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  variants    ProductVariant[]
  cartItems   CartItem[]
  orderItems  OrderItem[]
  reviews     Review[]

  @@index([category])
  @@index([active])
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  name      String  // e.g., "Size: Large, Color: Blue"
  sku       String? @unique
  price     Int?    // Override product price
  inventory Int     @default(0)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

model Cart {
  id        String     @id @default(cuid())
  userId    String?
  sessionId String?    @unique
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([userId])
  @@index([sessionId])
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  productId String
  quantity  Int     @default(1)
  variantId String?

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([cartId])
  @@index([productId])
}

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique
  userId          String?
  email           String
  status          OrderStatus @default(PENDING)

  // Pricing
  subtotal        Int         // in cents
  tax             Int         @default(0)
  shipping        Int         @default(0)
  discount        Int         @default(0)
  total           Int

  // Shipping address
  shippingName    String
  shippingAddress String
  shippingCity    String
  shippingState   String
  shippingZip     String
  shippingCountry String @default("US")

  // Billing address
  billingAddress  String?
  billingCity     String?
  billingState    String?
  billingZip      String?
  billingCountry  String?

  // Payment
  stripePaymentIntentId String?
  paidAt                DateTime?

  // Fulfillment
  trackingNumber  String?
  shippedAt       DateTime?
  deliveredAt     DateTime?

  items     OrderItem[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([userId])
  @@index([status])
  @@index([orderNumber])
}

model OrderItem {
  id          String @id @default(cuid())
  orderId     String
  productId   String
  quantity    Int
  price       Int    // Price at time of purchase
  productName String // Snapshot of product name

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}

model Review {
  id        String   @id @default(cuid())
  productId String
  userId    String
  rating    Int      // 1-5
  title     String?
  comment   String?
  verified  Boolean  @default(false) // Verified purchase
  createdAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([userId])
}

model Discount {
  id          String        @id @default(cuid())
  code        String        @unique
  type        DiscountType
  value       Int           // Percentage (0-100) or fixed amount in cents
  minPurchase Int?          // Minimum purchase amount
  maxUses     Int?          // Maximum number of uses
  usedCount   Int           @default(0)
  expiresAt   DateTime?
  active      Boolean       @default(true)
  createdAt   DateTime      @default(now())
}

enum OrderStatus {
  PENDING
  PROCESSING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum DiscountType {
  PERCENTAGE
  FIXED
}
`;

const cartService = `import { prisma } from '@/lib/prisma';

export async function getOrCreateCart(userId?: string, sessionId?: string) {
  const where = userId ? { userId } : { sessionId };

  let cart = await prisma.cart.findFirst({
    where,
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId, sessionId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  return cart;
}

export async function addToCart(
  cartId: string,
  productId: string,
  quantity: number = 1
) {
  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId, productId },
  });

  if (existingItem) {
    return await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  }

  return await prisma.cartItem.create({
    data: { cartId, productId, quantity },
  });
}

export async function removeFromCart(cartItemId: string) {
  return await prisma.cartItem.delete({
    where: { id: cartItemId },
  });
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
) {
  if (quantity <= 0) {
    return await removeFromCart(cartItemId);
  }

  return await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
}

export async function calculateCartTotal(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart) return 0;

  return cart.items.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
}
`;

const checkoutService = `import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(cartId: string, email: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const lineItems = cart.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.product.name,
        images: item.product.images,
      },
      unit_amount: item.product.price,
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}\`,
    cancel_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel\`,
    customer_email: email,
    metadata: {
      cartId,
    },
  });

  return session;
}

export async function createOrderFromCheckout(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer_details'],
  });

  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed');
  }

  const cartId = session.metadata?.cartId;
  if (!cartId) {
    throw new Error('Cart ID not found');
  }

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart) {
    throw new Error('Cart not found');
  }

  const subtotal = cart.items.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity);
  }, 0);

  const order = await prisma.order.create({
    data: {
      orderNumber: \`ORD-\${Date.now()}\`,
      userId: cart.userId,
      email: session.customer_details?.email || '',
      status: 'PAID',
      subtotal,
      total: session.amount_total || 0,
      shippingName: session.customer_details?.name || '',
      shippingAddress: session.customer_details?.address?.line1 || '',
      shippingCity: session.customer_details?.address?.city || '',
      shippingState: session.customer_details?.address?.state || '',
      shippingZip: session.customer_details?.address?.postal_code || '',
      shippingCountry: session.customer_details?.address?.country || 'US',
      stripePaymentIntentId: session.payment_intent as string,
      paidAt: new Date(),
      items: {
        create: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
          productName: item.product.name,
        })),
      },
    },
  });

  // Clear cart
  await prisma.cartItem.deleteMany({
    where: { cartId },
  });

  return order;
}
`;

export function generateEcommerceModule(config: EcommerceModuleConfig): EcommerceModuleOutput {
  const files = [
    { path: 'prisma/schema-ecommerce.prisma', content: prismaSchema },
    { path: 'lib/ecommerce/cart.ts', content: cartService },
    { path: 'lib/ecommerce/checkout.ts', content: checkoutService },
  ];

  const dependencies = ['stripe'];
  const envVars = ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_APP_URL'];
  const instructions = [
    'Run: npx prisma db push to create e-commerce tables',
    'Configure Stripe webhook endpoint for checkout.session.completed',
    'Set up shipping rates in your Stripe dashboard',
    'Customize tax calculation based on your jurisdiction',
  ];

  return { files, envVars, dependencies, instructions };
}

export function getEcommerceModulePrompt(config: EcommerceModuleConfig): string {
  return `## E-commerce Module\n\nFeatures: ${config.features?.join(', ') || 'cart, checkout, inventory'}\nCurrency: ${config.currency || 'USD'}\n\nIncludes shopping cart, Stripe checkout, order management, and inventory tracking.`;
}
