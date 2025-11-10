import { NextRequest, NextResponse } from 'next/server';
import { getShopifySession } from '../../../../lib/shopify-session-store';
import { validateShopParameter } from '../../../../lib/shopify-oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get('shop');
    
    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      );
    }

    if (!validateShopParameter(shopDomain)) {
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      );
    }

    const session =
      getShopifySession(shopDomain) ||
      getShopifySession(request.cookies.get('ds_shopify_shop')?.value || '');

    if (!session) {
      return NextResponse.json(
        { error: 'Shop not authenticated' },
        { status: 401 }
      );
    }

    // Set up Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected', shop: shopDomain })}\n\n`)
        );

        // Set up interval to check for pending updates
        const checkInterval = setInterval(async () => {
          try {
                     // Check for pending cart updates
         if (typeof global !== 'undefined' && global.pendingCartUpdates) {
           const pendingUpdate = global.pendingCartUpdates.get(shopDomain);
           
           if (pendingUpdate && pendingUpdate.timestamp > Date.now() - 5000) {
             // Send the cart update
             controller.enqueue(
               new TextEncoder().encode(`data: ${JSON.stringify({ type: 'cart-updated', data: pendingUpdate })}\n\n`)
             );
             
             // Remove the pending update
             global.pendingCartUpdates.delete(shopDomain);
           }
         }
          } catch (error) {
            console.error('Error in SSE stream:', error);
            controller.close();
            clearInterval(checkInterval);
          }
        }, 1000); // Check every second

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(checkInterval);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    return NextResponse.json(
      { error: 'Failed to setup SSE connection' },
      { status: 500 }
    );
  }
} 