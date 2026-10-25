sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"supplychain/test/integration/pages/ProductsList.gen",
	"supplychain/test/integration/pages/ProductsObjectPage.gen"
], function (JourneyRunner, ProductsListGenerated, ProductsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('supplychain') + '/test/flpSandbox.html#supplychain-tile',
        pages: {
			onTheProductsListGenerated: ProductsListGenerated,
			onTheProductsObjectPageGenerated: ProductsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

