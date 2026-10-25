// Dev server (port 8082): forward OData calls to the CAP app on 8080, like the other React demo (react-app).
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use('/odata', createProxyMiddleware({ target: 'http://localhost:8080', changeOrigin: true, logLevel: 'warn' }));
};
