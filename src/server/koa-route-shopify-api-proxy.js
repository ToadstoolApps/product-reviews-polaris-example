const querystring = require('querystring');
const fetch = require('node-fetch');

const DISALLOWED_URLS = [
	'/application_charges',
	'/application_credits',
	'/carrier_services',
	'/fulfillment_services',
	'/recurring_application_charges',
	'/script_tags',
	'/storefront_access_token',
	'/webhooks',
	'/oauth',
];

module.exports = async function shopifyApiProxy(ctx, pathname, next) {
	const { session, req: { query, method, body }} = ctx;

	if (session == null) {
		console.error('A session middleware must be installed to use ApiProxy.');
		ctx.throw(401, 'Unauthorized');
		return;
	}

	const { shop, accessToken } = session;

	if (shop == null || accessToken == null) {
		ctx.throw(401, 'Unauthorized');
		return;
	}

	if (!validRequest(pathname)) {
		ctx.throw(403, 'Endpoint not in whitelist');
		return;
	}

	try {
		const searchParams = querystring.stringify(query);
		const searchString = searchParams.length > 0
			? `?${searchParams}`
			: '';

		const url = `https://${shop}/admin/${pathname}${searchString}`;
		const result = await fetch(url, {
			method,
			body,
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Access-Token': accessToken,
			},
		});

		const data = await result.text();
		ctx.type = 'application/json';
		ctx.body = data;
	} catch (error) {
		console.log(error);
		ctx.throw(500, error);
	}
};

module.exports.DISALLOWED_URLS = DISALLOWED_URLS;

function validRequest(path) {
	let strippedPath = path.indexOf('?') > -1 ? path.split('?')[0] : path;
	strippedPath = strippedPath.indexOf('.json') > -1 ? strippedPath.split('.json')[0] : strippedPath;

	return DISALLOWED_URLS.every(resource => {
		return strippedPath.indexOf(resource) === -1;
	});
}