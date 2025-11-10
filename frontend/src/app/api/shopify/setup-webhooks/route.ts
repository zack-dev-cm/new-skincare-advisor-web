import { NextRequest, NextResponse } from 'next/server';
import { registerCartWebhook, listWebhooks } from '../../../../lib/shopify-webhooks';
import { getShopifySession } from '../../../../lib/shopify-session-store';
import { shopifyConfig } from '../../../../lib/shopify-config';
import { validateShopParameter } from '../../../../lib/shopify-oauth';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const shop =
      request.nextUrl.searchParams.get('shop') ||
      request.headers.get('x-shopify-shop-domain') ||
      request.headers.get('x-shopify-shop') ||
      request.cookies.get('ds_shopify_shop')?.value;

    if (!validateShopParameter(shop)) {
      return NextResponse.json(
        { error: 'Missing or invalid shop identifier' },
        { status: 400 }
      );
    }

    const session = getShopifySession(shop!);

    if (!session) {
      return NextResponse.json(
        {
          error: 'Shop not authenticated',
          details: 'Start OAuth at /api/shopify/auth/start?shop=your-store.myshopify.com',
        },
        { status: 401 }
      );
    }

    if (!SHOPIFY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'SHOPIFY_WEBHOOK_SECRET must be configured on the server' },
        { status: 500 }
      );
    }

    // Generate webhook secret
    const webhookSecret = SHOPIFY_WEBHOOK_SECRET;

    // Webhook URL for your app
    const appUrl = shopifyConfig.appUrl || process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        { error: 'SHOPIFY_APP_URL (or NEXT_PUBLIC_APP_URL) must be configured for webhook callbacks' },
        { status: 500 }
      );
    }

    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/shopify/webhooks/cart-updated`;

    // Check if webhook already exists
    const existingWebhooks = await listWebhooks(session.shop, session.accessToken);
    const cartWebhook = existingWebhooks.find((webhook: any) => 
      webhook.topic === 'carts/update' && webhook.address === webhookUrl
    );

    if (cartWebhook) {
      return NextResponse.json({
        success: true,
        message: 'Webhook already exists',
        webhook: cartWebhook
      });
    }

    // Register new webhook
    const webhook = await registerCartWebhook({
      shopDomain: session.shop,
      accessToken: session.accessToken,
      webhookUrl,
      webhookSecret
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook registered successfully',
      webhook
    });
  } catch (error) {
    console.error('Error setting up webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhooks' },
      { status: 500 }
    );
  }
} 