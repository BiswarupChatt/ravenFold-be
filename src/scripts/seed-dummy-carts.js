import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import ROLES from '@/common/constants/roles.constant.js';
import { connectMongoDB, disconnectMongoDB } from '@/infrastructure/database/mongodb.js';
import CartItem from '@/modules/cart/models/cart-item.model.js';
import Cart from '@/modules/cart/models/cart.model.js';
import Category from '@/modules/category/models/category.model.js';
import InventoryStock from '@/modules/inventory/models/inventory.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Product from '@/modules/product/models/product.model.js';
import User from '@/modules/users/models/user.model.js';

const DEMO_PREFIX = 'admin-cart-demo';
const CURRENCY = 'INR';

const optionSignature = (optionValues = []) => {
  return optionValues
    .map((optionValue) => `${optionValue.optionName.toLowerCase()}:${optionValue.value.toLowerCase()}`)
    .sort()
    .join('|');
};

const upsertUser = async ({ email, name, phone }) => {
  return User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        name,
        phone,
        role: ROLES.CUSTOMER,
        roles: [ROLES.CUSTOMER],
        isActive: true,
      },
    },
    {
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();
};

const upsertCategory = async () => {
  return Category.findOneAndUpdate(
    { slug: DEMO_PREFIX },
    {
      $set: {
        name: 'Demo Cart Collection',
        slug: DEMO_PREFIX,
        parentCategoryId: null,
        image: '',
        isActive: true,
      },
    },
    {
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();
};

const upsertProduct = async ({ categoryId, name, slug, sku, basePrice, salePrice = null, hasVariants = false }) => {
  return Product.findOneAndUpdate(
    { sku },
    {
      $set: {
        name,
        slug,
        description: `${name} seeded for admin cart testing.`,
        shortDescription: 'Seeded cart demo product',
        categoryId,
        basePrice,
        salePrice,
        sku,
        hasVariants,
        images: [],
        status: 'active',
        isFeatured: false,
        tags: ['demo', 'cart'],
        attributes: [],
      },
    },
    {
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();
};

const upsertVariant = async ({ productId, sku, optionValues, price, salePrice = null }) => {
  return ProductVariant.findOneAndUpdate(
    { sku },
    {
      $set: {
        productId,
        sku,
        optionValues,
        optionSignature: optionSignature(optionValues),
        price,
        salePrice,
        images: [],
        isActive: true,
      },
    },
    {
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();
};

const upsertInventory = async ({ productId, variantId = null, stockOnHand }) => {
  return InventoryStock.findOneAndUpdate(
    {
      productId,
      variantId,
    },
    {
      $set: {
        productId,
        variantId,
        stockOnHand,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        trackInventory: true,
        allowBackorder: false,
      },
    },
    {
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();
};

const buildCartItem = ({ cartId, product, variant = null, quantity }) => {
  const priceSource = variant || product;
  const basePrice = variant ? variant.price : product.basePrice;
  const salePrice = priceSource.salePrice;
  const price = Number((salePrice ?? basePrice).toFixed(2));
  const lineTotal = Number((price * quantity).toFixed(2));
  const variantLabel = variant?.optionValues?.length
    ? variant.optionValues.map((option) => `${option.optionName}: ${option.value}`).join(', ')
    : '';

  return {
    cartId,
    productId: product._id,
    variantId: variant?._id || null,
    quantity,
    priceAtTime: price,
    lineTotal,
    priceSnapshot: {
      basePrice,
      salePrice: salePrice ?? null,
      price,
      currency: CURRENCY,
    },
    productSnapshot: {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      image: '',
      variantSku: variant?.sku || '',
      variantLabel,
    },
  };
};

const upsertCart = async ({ user, status, items }) => {
  const cart = await Cart.findOneAndUpdate(
    {
      userId: user._id,
      status,
    },
    {
      $set: {
        userId: user._id,
        status,
        currency: CURRENCY,
        expiresAt: null,
      },
    },
    {
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();

  await CartItem.deleteMany({ cartId: cart._id }).exec();

  const cartItems = items.map((item) => buildCartItem({ cartId: cart._id, ...item }));
  const totals = cartItems.reduce(
    (summary, item) => ({
      subtotal: summary.subtotal + item.lineTotal,
      itemCount: summary.itemCount + 1,
      totalQuantity: summary.totalQuantity + item.quantity,
    }),
    {
      subtotal: 0,
      itemCount: 0,
      totalQuantity: 0,
    },
  );

  await CartItem.insertMany(cartItems);

  cart.subtotal = Number(totals.subtotal.toFixed(2));
  cart.itemCount = totals.itemCount;
  cart.totalQuantity = totals.totalQuantity;

  await cart.save();

  return cart;
};

const seedDummyCarts = async () => {
  await connectMongoDB();

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected. Check MONGO_URI and MONGO_DB_NAME.');
  }

  const category = await upsertCategory();
  const tote = await upsertProduct({
    categoryId: category._id,
    name: 'Demo Raven Tote',
    slug: `${DEMO_PREFIX}-raven-tote`,
    sku: 'DEMO-CART-TOTE',
    basePrice: 1299,
    salePrice: 999,
  });
  const hoodie = await upsertProduct({
    categoryId: category._id,
    name: 'Demo Raven Hoodie',
    slug: `${DEMO_PREFIX}-raven-hoodie`,
    sku: 'DEMO-CART-HOODIE',
    basePrice: 2499,
    salePrice: 2199,
    hasVariants: true,
  });
  const hoodieBlackMedium = await upsertVariant({
    productId: hoodie._id,
    sku: 'DEMO-CART-HOODIE-BLK-M',
    optionValues: [
      { optionName: 'Color', value: 'Black' },
      { optionName: 'Size', value: 'M' },
    ],
    price: 2499,
    salePrice: 2199,
  });
  const hoodieAshLarge = await upsertVariant({
    productId: hoodie._id,
    sku: 'DEMO-CART-HOODIE-ASH-L',
    optionValues: [
      { optionName: 'Color', value: 'Ash' },
      { optionName: 'Size', value: 'L' },
    ],
    price: 2499,
    salePrice: null,
  });

  await Promise.all([
    upsertInventory({ productId: tote._id, stockOnHand: 40 }),
    upsertInventory({ productId: hoodie._id, variantId: hoodieBlackMedium._id, stockOnHand: 20 }),
    upsertInventory({ productId: hoodie._id, variantId: hoodieAshLarge._id, stockOnHand: 15 }),
  ]);

  const [ananya, rohan, meera, arjun] = await Promise.all([
    upsertUser({
      email: 'ananya.cart.demo@ravenfold.local',
      name: 'Ananya Sen',
      phone: '9000001001',
    }),
    upsertUser({
      email: 'rohan.cart.demo@ravenfold.local',
      name: 'Rohan Mehta',
      phone: '9000001002',
    }),
    upsertUser({
      email: 'meera.cart.demo@ravenfold.local',
      name: 'Meera Iyer',
      phone: '9000001003',
    }),
    upsertUser({
      email: 'arjun.cart.demo@ravenfold.local',
      name: 'Arjun Das',
      phone: '9000001004',
    }),
  ]);

  const carts = await Promise.all([
    upsertCart({
      user: ananya,
      status: 'active',
      items: [
        { product: tote, quantity: 2 },
        { product: hoodie, variant: hoodieBlackMedium, quantity: 1 },
      ],
    }),
    upsertCart({
      user: rohan,
      status: 'active',
      items: [
        { product: hoodie, variant: hoodieAshLarge, quantity: 1 },
      ],
    }),
    upsertCart({
      user: meera,
      status: 'abandoned',
      items: [
        { product: tote, quantity: 1 },
        { product: hoodie, variant: hoodieAshLarge, quantity: 2 },
      ],
    }),
    upsertCart({
      user: arjun,
      status: 'converted',
      items: [
        { product: hoodie, variant: hoodieBlackMedium, quantity: 1 },
      ],
    }),
  ]);

  console.log(`Seeded ${carts.length} demo carts.`);
  console.log('Open the admin Cart page and filter by Active, Abandoned, or Converted.');
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDummyCarts()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectMongoDB();
    });
}

export { seedDummyCarts };
