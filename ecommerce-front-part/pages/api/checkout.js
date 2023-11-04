import { mongooseConnect } from "@/lib/mongoose";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
const stripe = require('stripe')(process.env.STRIPE_SK)

export default async function hander(req, res) {
    if (req.method !== 'POST') {
        res.json('should be a POST request')
        return;
    }
    const {name, email, city, postalCode, streetAddress, country, cartProducts,} = req.body
    await mongooseConnect()
    const productsIds = cartProducts
    const uniqueIds = [...new Set(productsIds)]
    const productsInfos = await Product.find({_id: uniqueIds})
    const { successUrl, cancelUrl } = req.body

    let line_items = []
    for (const productId of uniqueIds) {
        const productInfo = productsInfos.find(p => p._id.toString() === productId)
        const quantity = productsIds.filter(id => id === productId)?.length || 0
        if (quantity > 0 && productInfo) {
            line_items.push({
                quantity,
                price_data: {
                    currency: 'AUD',
                    product_data: {name: productInfo.title},
                    unit_amount: productInfo.price * 100,
                },
            })
        }
    }
    
    const session = await getServerSession(req, res, authOptions)

    const orderDoc = await Order.create({
        line_items, name, email, city, postalCode, streetAddress, country, paid: false, userEmail: session?.user?.email
    })

    console.log({orderDoc, session})

    const stripeSession = await stripe.checkout.sessions.create({
        line_items,
        mode: 'payment',
        customer_email: email,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {orderId: orderDoc._id.toString()},
    })

    res.json({
        url: stripeSession.url,
    })
}