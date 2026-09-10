# Punique Kitchen Hub

Build a complete, production-ready food ordering platform for "PUNIQUE KITCHEN", a restaurant based in Yenagoa, Bayelsa State, Nigeria. The platform must allow customers to browse the menu, place orders for pickup or delivery, and pay online. It must include a powerful admin dashboard for managing orders, menu items, and revenue. The design should be modern, responsive, and mobile-first, with a vibrant African-inspired aesthetic.

## Core Requirements

### 1. Customer-Facing Web App (PWA – works on all devices)

- **Homepage**:

  - Hero section with brand name “PUNIQUE KITCHEN”, tagline, and a CTA “Order Now”.

  - Featured dishes carousel.

  - Announcement banner for promos/discounts.

- **Menu Page**:

  - Categories:

    - Everyday Favourites (Creamy Beef Sandwich – ₦1,000, Pancakes – ₦1,000)

    - Signature Dishes (Stir Fry Noodles and Egg – ₦1,400)

    - Special Dishes (customizable list)

    - Rice Dishes (Smokey Jollof, Stir-Fried Rice, Special Asun Rice – allow admin to add more and set prices)

    - Soups (Egusi, Okra, Afang – with options for protein add-ons like beef, goat meat, fish)

    - Sauces (Beef Curry, Chicken Curry, Goat Meat Curry – sold as sides or with rice)

  - Each item displays image, name, description, price, and “Add to Cart” button.

  - Filter by category. Search bar.

- **Cart**:

  - Sidebar or page with item list, quantity selector, remove button, subtotal, delivery fee (if applicable), total.

  - Option to choose Pickup or Delivery.

  - If Delivery: input delivery address within Yenagoa (with Google Maps autocomplete or manual entry), show estimated delivery time.

- **Checkout**:

  - Collect customer name, phone number (WhatsApp-enabled), email (optional).

  - Payment integration via **Paystack** (Nigerian payment gateway) – accept card, bank transfer, USSD. Use test keys for development.

  - Order confirmation screen with order ID and estimated pickup/delivery time.

- **Order Tracking** (real-time):

  - Customers can view order status: “Received”, “Preparing”, “Ready for Pickup”, “Out for Delivery”, “Delivered”.

  - Status updates via email/SMS (optional).

- **Authentication** (optional but recommended):

  - Sign up / login with phone number (OTP via SMS or WhatsApp) or email/password using Supabase Auth.

  - Order history for logged-in users.

### 2. Admin Dashboard (protected, accessible only by PUNIQUE KITCHEN staff)

- **Dashboard Home**: 

  - Today’s orders count, revenue total, pending orders, popular items.

  - Graphs for weekly/monthly revenue (Chart.js or Recharts).

- **Order Management**:

  - List of all orders with filters (status, date, pickup/delivery).

  - Click to view details: items, customer info, address, total.

  - Update order status with a dropdown, which triggers real-time update for the customer.

  - Print order receipt.

- **Menu Management**:

  - Add, edit, delete menu items (name, description, price, category, image upload via Supabase Storage).

  - Mark items as “out of stock”.

  - Manage categories and subcategories.

- **Customer Management**:

  - View registered customers, order history per customer.

- **Settings**:

  - Set delivery fee, operational hours, closing days.

  - Configure payment methods (Paystack live keys later).

  - Manage discount codes.

## Technical Stack (to implement)

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui or Mantine for components, Framer Motion for micro-interactions.

- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Realtime subscriptions) for full backend-as-a-service.

- **State Management**: Zustand or React Context for cart state.

- **Payment**: Paystack inline integration (popup or redirect).

- **Maps**: Google Maps API for address autocomplete (or use free nominatim for geocoding in Yenagoa if budget limited, but Google recommended).

- **Hosting**: Vercel (frontend), Supabase (backend). Custom domain setup ready.

- **Real-time**: Supabase Realtime to push order status updates to customer app without refresh.

- **PWA**: next-pwa to enable installable mobile app experience with offline capability.

## Database Schema (Supabase tables)

- `profiles` (id, phone, name, email, created_at)

- `categories` (id, name, slug, image_url)

- `menu_items` (id, name, description, price, category_id, image_url, in_stock, created_at)

- `orders` (id, user_id nullable, customer_name, phone, email, address, delivery_type, status, total, delivery_fee, discount_code, created_at)

- `order_items` (id, order_id, menu_item_id, quantity, price_at_time)

- `coupons` (id, code, discount_percent, valid_until, max_uses)

## UI/UX Guidelines

- Color scheme: Warm earthy tones – deep orange (#E67E22), dark green (#1B4332), cream (#FFF9F0), gold accents.

- Fonts: Inter for body, Playfair Display for headings.

- Mobile first, but fully responsive.

- Smooth transitions, loading skeletons, toast notifications.

- Show Naira (₦) currency symbol throughout.

- Ensure fast load times and SEO for local search “food delivery Yenagoa”.

## Additional Advanced Features (to make it “powerful”)

- WhatsApp order sharing: after order placed, show a button “Share via WhatsApp” with a pre-filled message including order summary and order ID to a designated kitchen number.

- Print-friendly kitchen receipt on the admin side when an order comes in (auto-print via web thermal printer integration if possible).

- Google Analytics and Facebook Pixel setup for tracking conversions.

- Automated email receipts using Supabase Edge Functions or Resend.

- Ability for admin to set “today’s special” that gets highlighted on the menu.

- Multi-language support (English and Pidgin? optional but locally appealing).

## Deliverable

Generate the full codebase with all necessary files, well-commented, with instructions for setup (environment variables for Supabase URL, anon key, Paystack public key, Google Maps API key). Include a README.md with clear steps to run the project locally and deploy. Create sample seed data for the menu items listed above.

Build this step by step, starting with project scaffolding, then database schema, then frontend pages, then admin panel, then payment integration, ensuring everything works seamlessly.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://punique-order-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1bafbe35-4dd8-400f-beea-4a366745d6a7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
