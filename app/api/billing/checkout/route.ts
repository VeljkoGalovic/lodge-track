import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/signin", req.url))
  }

  const { searchParams } = new URL(req.url)
  const priceId = searchParams.get("priceId")

  if (!priceId) {
    return NextResponse.redirect(new URL("/dashboard/billing?error=missing_price", req.url))
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    })

    if (!user?.organization) {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    }

    // In a real implementation, you would:
    // 1. Create a Stripe checkout session
    // 2. Redirect to Stripe
    // For now, we'll redirect back with a message

    // TODO: Implement Stripe checkout
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const checkoutSession = await stripe.checkout.sessions.create({
    //   customer: user.organization.subscription?.stripeCustomerId || undefined,
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   mode: "subscription",
    //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
    //   metadata: {
    //     orgId: user.organization.id,
    //     priceId,
    //   },
    // })
    // return NextResponse.redirect(checkoutSession.url!)

    return NextResponse.redirect(new URL("/dashboard/billing?success=demo_mode", req.url))
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.redirect(new URL("/dashboard/billing?error=checkout_failed", req.url))
  }
}