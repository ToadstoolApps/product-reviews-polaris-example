import 'isomorphic-fetch';
import koa from 'koa';
import koaRouter from 'koa-router';
import koaBody from 'koa-bodyparser';
import serve from 'koa-static';
import mount from 'koa-mount';
import views from 'koa-views';
import session from 'koa-session';
import shopifyAuth, { verifyRequest } from '@shopify/koa-shopify-auth';
import graphQLProxy from '@shopify/koa-shopify-graphql-proxy';
import { graphqlKoa, graphiqlKoa } from 'apollo-server-koa';
import fs from 'fs';
import path from 'path';
import { schema } from './review-mock-data-schema';
import shopifyApiProxy from './koa-route-shopify-api-proxy';

/* eslint-disable babel/new-cap */
const app = new koa();
const router = new koaRouter();
/* eslint-enable babel/new-cap */

require('dotenv').config();

const { SHOPIFY_APP_KEY, SHOPIFY_APP_SECRET, NODE_ENV } = process.env;
const PORT = NODE_ENV === 'production' ? 3000 : 3001;

app.keys = [SHOPIFY_APP_SECRET];
app.use(session(app));

app.use(views(path.join(__dirname, '../../src/server/'), { extension: 'ejs' }));
app.use(mount('/install', async (ctx, next) => { await ctx.render('install'); }));

if (NODE_ENV === 'production') {
  app.use(
    shopifyAuth({
      apiKey: SHOPIFY_APP_KEY,
      secret: SHOPIFY_APP_SECRET,
      // our app's permissions
      scopes: ['write_products', 'read_products', 'read_orders', 'write_orders'],
      // our own custom logic after authentication has completed
      afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        console.log('We did it!', shop, accessToken);
        ctx.redirect('/');
      },
    }),
  );
  // secure all middleware after this line
  app.use(verifyRequest({ fallbackRoute: '/install' }));
}

router.post('/graphql', koaBody(), graphqlKoa({ schema }));
router.get('/graphql', graphqlKoa({ schema }));
router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }));
app.use(router.routes());

app.use(router.allowedMethods());
if (NODE_ENV === 'production') {
  app.use(serve(path.join(__dirname, '../../build/client/')));
  console.log('production build ready on port: ', PORT);
}
app.listen(PORT);
