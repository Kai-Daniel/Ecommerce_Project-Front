import { mongooseConnect } from "@/lib/mongoose";
import { Product } from "@/models/Product";

export default async function handle(req, res) {
    await mongooseConnect()
    const {categories, sort, phrase, ...filters} = req.query
    let [sortField, sortOrder] = (sort || '_id-desc').split('-')
    const productsQuery = {}
        // category: categories.split(','),
        // category: { $in: categories.split(',') },
    if (categories) {
        productsQuery.category = categories.split(',')
    }
    if (phrase) {
        productsQuery['$or'] = [
            {title: {$regex: phrase, $options: 'i'}},
            {description: {$regex: phrase, $options: 'i'}},
        ]
    }
    if (Object.keys(filters).length > 0) {
        Object.keys(filters).forEach(key => {
            productsQuery[`properties.${key}`] = filters[key];
        });
    }
    console.log('Constructed Query:', productsQuery);  // Debug: Print constructed query
    const foundProducts = await Product.find(productsQuery, null, {sort:{[sortField]: sortOrder==='asc' ? 1 : -1}});
    console.log('Found Products:', foundProducts);  // Debug: Print found products
    res.json(foundProducts)
}