////////////////////////////////
// App : BulkUpload
// Owner  : Gihan Herath
// Last changed date : 2017/08/25
// Version : 6.1.0.1
// Modified By : Kasun
/////////////////////////////////

(function ()
{
  'use strict';

  angular
    .module('app.bulkupload', [])
    .config(config)
    .filter('parseDate',parseDateFilter);

  /** @ngInject */
  function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider, mesentitlementProvider)
  {

    // State
    $stateProvider
      .state('app.bulkupload', {
        url    : '/bulkupload',
        views  : {
          'bulkupload@app': {
            templateUrl: 'app/main/bulkupload/bulkupload.html',
            controller : 'BulkuploadController as vm'
          }
        },
        resolve: {
			security: ['$q','mesentitlement','$timeout','$rootScope','$state','$location', function($q,mesentitlement,$timeout,$rootScope,$state, $location){
				return $q(function(resolve, reject) {
					$timeout(function() {
						if ($rootScope.isBaseSet2) {
							resolve(function () {
								var entitledStatesReturn = mesentitlement.stateDepResolver('bulkupload');

								mesentitlementProvider.setStateCheck("bulkupload");

								if(entitledStatesReturn !== true){
									return $q.reject("unauthorized");
								}
							});
						} else {
							return $location.path('/guide');
						}
					});
				});
			}]
        },
        bodyClass: 'bulkupload'
      });

    //Api
    msApiProvider.register('cc_invoice.invoices', ['app/data/cc_invoice/invoices.json']);

    // Navigation

    msNavigationServiceProvider.saveItem('bulkupload', {
      title    : 'bulkupload',
      icon     : 'icon-leaf',
      state    : 'app.bulkupload',
      /*stateParams: {
       'param1': 'page'
       },*/
      weight   : 6
    });
  }

  function parseDateFilter(){
    return function(input){
      return new Date(input);
    };
  }
})();
