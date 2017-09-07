////////////////////////////////
// App : Plans
// File : Plans Controller
// Owner  : GihanHerath
// Modified by  : Kasun
// Modified date : 2017/02/15
// Version : 6.0.1.0
/////////////////////////////////

(function ()
{
	'use strict';

	angular
		.module('app.bulkupload')
		.controller('BulkuploadController', BulkuploadController);

	/** @ngInject */
	function BulkuploadController($scope, $timeout, $mdDialog, $http, $window, $mdMedia, $mdSidenav, $filter, $charge, $errorCheck, notifications, $rootScope)
	{
		var vm = this;

		vm.appInnerState = "default";
		vm.pageTitle="Create Plan";
		vm.checked = [];
		vm.colors = ['blue-bg', 'blue-grey-bg', 'orange-bg', 'pink-bg', 'purple-bg'];

		vm.selectedPlan = {};
		vm.toggleSidenav = toggleSidenav;

		vm.responsiveReadPane = undefined;
		vm.activeInvoicePaneIndex = 0;
		vm.dynamicHeight = false;

		vm.scrollPos = 0;
		vm.scrollEl = angular.element('#content');
		vm.selectedMailShowDetails = false;

		// Methods
		vm.closeReadPane = closeReadPane;
		vm.addInvoice = toggleinnerView;
		vm.changePlans = changePlans;
		vm.billingCycleHandler = billingCycleHandler;
		vm.selectPlan = selectPlan;

		$scope.showFilers=true;
		$scope.submitPlan=submitPlan;
		$scope.plan={
			billing_cycle: "auto"
		};
		$scope.isReadLoaded;
		$scope.items = [];

		$scope.BaseCurrency = "";
		$scope.currencyRate = 1;
		// $scope.decimalPoint = 2;
		$scope.content={};
		//////////

		// Watch screen size to activate responsive read pane
		$scope.$watch(function ()
		{
			// console.log($scope.embedHovered);
			angular.element('.embed-btn').mouseenter(function () {
				// angular.element('#subscriptionPlan').addClass('embed-content');
				$scope.embedHovered = true;
			});
			angular.element('.embed-btn').mouseleave(function () {
				// angular.element('#subscriptionPlan').removeClass('embed-content');
				$scope.embedHovered = false;
			});

			if($scope.embedFormCopied){
				$timeout(function(){
					$scope.coppiedTimeout = true;
				},2000);
			}else{
				$scope.coppiedTimeout = false;
			}

			var embedCode = document.getElementsByClassName('embed-code');
			// if(embedCode != undefined){
			// 	angular.forEach(embedCode, function (e) {
			// 		hljs.highlightBlock(e);
			// 	});
			// }

			return $mdMedia('gt-md');
		}, function (current)
		{
			vm.responsiveReadPane = !current;
		});

		// Watch screen size to activate dynamic height on tabs
		$scope.$watch(function ()
		{
			return $mdMedia('xs');
		}, function (current)
		{
			vm.dynamicHeight = current;
		});

		function gst(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == ' ') c = c.substring(1, c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
			}
			//debugger;
			return null;
		}

		function getDomainName() {
			var _st = gst("domain");
			return (_st != null) ? _st : ""; //"248570d655d8419b91f6c3e0da331707 51de1ea9effedd696741d5911f77a64f";
		}

		function getDomainExtension() {
			var _st = gst("extension_mode");
			return (_st != null) ? _st : "test"; //"248570d655d8419b91f6c3e0da331707 51de1ea9effedd696741d5911f77a64f";
		}

		/**
		 * Close read pane
		 */
		function closeReadPane()
		{
			if(vm.changePlanForm.$pristine && vm.changePlanForm.$dirty ){
				var confirm = $mdDialog.confirm()
					.title('Are you sure?')
					.textContent('Fields have changed and you might have unsaved data. Are you sure you want to leave this page?')
					.ariaLabel('Are you sure?')
					.targetEvent()
					.ok('Yes')
					.cancel('Stay');

				$mdDialog.show(confirm).then(function() {
					vm.changePlanForm.$pristine = false;
					vm.changePlanForm.$dirty = false;
					$scope.editOff = false;
					vm.pageTitle = "Create Plan";
				}, function() {
				});
			}else {
				$scope.editOff = false;
				vm.activePlanPaneIndex = 0;
			}

			$timeout(function ()
			{
				vm.scrollEl.scrollTop(vm.scrollPos);
			}, 650);
			$scope.showFilers=true;
		}

		/**
		 * Toggle sidenav
		 *
		 * @param sidenavId
		 */
		function toggleSidenav(sidenavId)
		{
			$mdSidenav(sidenavId).toggle();
		}

		/**
		 * Toggle innerview
		 *
		 */

		function toggleinnerView(state){
			if(vm.appInnerState === "default"){
				vm.appInnerState = "add";
				vm.pageTitle="View current plan";
				$scope.showFilers=false;
			}else{
				vm.appInnerState = "default";
				vm.pageTitle="Change Plan";
			}
		}

		function selectPlan(plan)
		{
			vm.showFilters=false;
			$scope.showInpageReadpane = true;
			//$timeout(function ()
			//{
			//  vm.activePlanPaneIndex = 1;
			//
			//  // Store the current scrollPos
			//  vm.scrollPos = vm.scrollEl.scrollTop();
			//
			//  // Scroll to the top
			//  vm.scrollEl.scrollTop(0);
			//});
		}

		$scope.bulkUpload={};
		$scope.bulkUpload.type='profile';
		$scope.bulkSampleCsv={
			0:{
				key:"profile",
				value:"https://ccresourcegrpdisks974.blob.core.windows.net/bulkupload/profiles.csv"
			},
			1:{
				key:"subscriptionBulk",
				value:"https://ccresourcegrpdisks974.blob.core.windows.net/bulkupload/subscriptions.csv"
			}
		};
		//$scope.bulkSampleCsv.push("https://ccresourcegrpdisks974.blob.core.windows.net/b2c/profiles.csv");

		vm.submitted=false;
		$scope.submitBulkUpload = function () {
			if($scope.bulkUpload.files.length>0 && $scope.bulkUpload.type!="" && $scope.bulkUpload.type!=undefined) {
				vm.submitted=true;
				angular.forEach($scope.bulkUpload.files, function (obj) {
					//$uploader.uploadMedia("CCProfile_"+$scope.customer_supplier.profile.profileId, obj.lfFile, obj.lfFileName);
					//
					//$uploader.onSuccess(function (e, data) {
					//  //debugger;
					//  var path = $storage.getMediaUrl("CCProfile_"+$scope.customer_supplier.profile.profileId, obj.lfFileName);
					//
					//  $scope.customer_supplier.profile.attachment = path;
					//  $scope.submitProfile();
					//});
					//$uploader.onError(function (e, data) {
					//  //debugger;
					//  $scope.customer_supplier.profile.attachment = "";
					//  $scope.submitProfile();
					//});
					var filename= obj.lfFileName.substr(0,obj.lfFileName.length-(obj.lfFileName.split('.')[obj.lfFileName.split('.').length-1].length+1));
					var format=obj.lfFileName.split('.')[obj.lfFileName.split('.').length-1];
					var app="bulkUploads/BulkType_"+$scope.bulkUpload.type;

					var FR= new FileReader();

					FR.onload = function(e) {
						var contents = e.target.result;

            if(format=="xlsx")
            {
              var workbook = XLSX.read(contents, {
                type: 'binary'
              });
              workbook.SheetNames.forEach(function(sheetName) {
                // Here is your object
                //var XL_row_object = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                //var json_object = JSON.stringify(XL_row_object);
                var XL_csv_object = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                //console.log(json_object);
                $scope.$apply(function () {
                  $scope.fileReader = XL_csv_object.split('\n');
                });

              })
            }
            else
            {
              $scope.$apply(function () {
                $scope.fileReader = contents.split('\n');
              });
            }

						$scope.fileValidated=true;
						angular.forEach($scope.fileReader, function (obj) {
							if(obj=="" && $scope.fileReader[$scope.fileReader.length-1]==obj)
							{

							}
							else
							{
								var contentRec=obj.split(',');
								if(contentRec[0]==""||contentRec[0]==null||contentRec[0]==undefined)
								{
									$scope.fileValidated=false;
								}
								if(contentRec[1]==""||contentRec[1]==null||contentRec[1]==undefined)
								{
									$scope.fileValidated=false;
								}
								if(contentRec[2]==""||contentRec[2]==null||contentRec[2]==undefined)
								{
									$scope.fileValidated=false;
								}
								if(contentRec[3]==""||contentRec[3]==null||contentRec[3]==undefined)
								{
									$scope.fileValidated=false;
								}

								//for(var i=0;i<contentRec.length;i++)
								//{
								//  if(contentRec[i]==""||contentRec[i]==null||contentRec[i]==undefined)
								//  {
								//    $scope.fileValidated=false;
								//  }
								//}
							}
						});

						if($scope.fileValidated)
						{
							var FR2= new FileReader();
							FR2.readAsDataURL( obj.lfFile );
							FR2.addEventListener("load", function(e) {
								// $timeout(function () {
								$scope.addedBulkFile = e.target.result;
								$scope.$apply();
								$scope.divClass = false;
								// },0);
								var fileType=$scope.addedBulkFile.split(',')[0]+",";
								var gutranid=new Date();
								var timest=new Date(gutranid+ ' UTC').getTime();

								var filenameEdit=filename.replace(/[\s]/g, '_');


								var uploadBulkFileObj = {
									"base64Image": $scope.addedBulkFile,
									"fileName": filenameEdit+"_"+timest,
									"format": format,
									"app": app,
									"fileType": fileType
								}
								$charge.storage().storeImage(uploadBulkFileObj).success(function (data) {
									$scope.bulkUpload.uploadedUrl = data.fileUrl;

									var processBulkFileObj = {
										"processCode": $scope.bulkUpload.type,
										"data": $scope.bulkUpload.uploadedUrl,
										"isToAPIManagement": false,
										"guTranId": timest
									}

									$charge.bulkupload().uploadFile(processBulkFileObj).success(function (data) {
										notifications.toast("Bulk file uploaded successfully","success");
										$scope.bulkUpload={};
										$scope.bulkUpload.files=[];
										$scope.uploadDone = true;
										$scope.uploadDoneMessage = "Uploading success";
										vm.submitted=false;
										refreshUploader();

									}).error(function (data) {
										//console.log(data);
										notifications.toast("Uploading bulk file Failed","error");
										$scope.uploadDone = true;
										$scope.uploadDoneMessage = "Uploading failed";
										vm.submitted=false;
										refreshUploader();
									})

								}).error(function (data) {
									//console.log(data);
									notifications.toast("Uploading bulk file Failed","error");
									$scope.uploadDone = true;
									$scope.uploadDoneMessage = "Uploading failed";
									$scope.bulkUpload.uploadedUrl = "";
									vm.submitted=false;
									refreshUploader();
								})

							});
						}
						else
						{
							notifications.toast("File validation failed. Please check the file content again!","error");
							$scope.bulkUpload.files=[];
							vm.submitted=false;
							refreshUploader();
						}
					};
					FR.readAsBinaryString( obj.lfFile );
					//FR.readAsText(obj.lfFile);
				});
			}
			else
			{
				notifications.toast("Please add a file and select type to upload","error");
			}
		}

		$scope.openItemUrl = function(url) {
			//$window.location.href=url;
			$window.open(
				url, '_blank'
			);
		};

		//Kasun_Wijeratne_29_AUG_2017
		function refreshUploader() {
			// debugger;
			document.getElementById('refreshUploader').click();
		};
		$scope.sampleBulkPreview = function () {
			$scope.showSampleBulkPreview = !$scope.showSampleBulkPreview;
		};
		$scope.isUploaderVisited = false;
		$scope.step1Done = false;
		$scope.step2Done = false;
		$scope.showAccordionBody = function (accordion, isValidIncrement) {
			$timeout(function(){
				if($scope.isUploaderVisited){
					$scope.expandAccordion = accordion;
				}else if(accordion == 1 && isValidIncrement){
					$scope.expandAccordion = accordion;
					$scope.isUploaderVisited = true;
					$scope.step1Done = true;
				}else if(accordion == 0){
					$scope.expandAccordion = accordion;
				}
			});
		};
		$scope.resetUploader = function (state) {
			if(state == 'reupload'){
				$scope.bulkUpload.files=[];
				$scope.uploadDone = false;
			}else{
				$scope.bulkUpload.files=[];
				$scope.expandAccordion = 0;
				$scope.uploadDone = false;
			}
		};
		//Kasun_Wijeratne_29_AUG_2017 - END
		function changePlans(){
			toggleinnerView('add');
		}

		function submit(){
			toggleinnerView('add');
		}

		$charge.settingsapp().getDuobaseFieldDetailsByTableNameAndFieldName("CTS_GeneralAttributes","BaseCurrency").success(function(data) {
			$scope.BaseCurrency=data[0].RecordFieldData;
			//$scope.selectedCurrency = $scope.BaseCurrency;

		}).error(function(data) {
			//console.log(data);
			$scope.BaseCurrency="USD";
			//$scope.selectedCurrency = $scope.BaseCurrency;
		})

		function billingCycleHandler(selection){
			if(selection=='fixed'){
				$scope.showNoOfCycles = true;
			}else{
				$scope.showNoOfCycles = false;
			}
		}

		$scope.$watch(function () {
			var elem = document.querySelector('#billingFrqCurrency');
			var elem2 = document.querySelector('#billingFrqCurrencyEdit');
			if(elem != null){
				if(elem.innerText != ""){
					var innerCurr = elem.innerText.split('0')[0];
					document.querySelector('#billingFrqCurrency').innerText = innerCurr;
				}
			}
			if(elem2 != null) {
				if (elem2.innerText != "") {
					var innerCurr2 = elem2.innerText.split('0')[0];
					document.querySelector('#billingFrqCurrencyEdit').innerText = innerCurr2;
				}
			}
			vm.planContentHeight = window.innerHeight - 145;
		});

		$scope.updateScroll = function (state) {
			var elem3 = document.getElementById('createPlanContent');
			var elem4 = document.getElementById('updatePlanContent');
			if(elem3 != undefined && state == 'create'){
				$timeout(function(){
					elem3.scrollTop = elem3.scrollHeight;
				});
			}
			if(elem4 != undefined && state == 'edit'){
				$timeout(function(){
					elem4.scrollTop = elem4.scrollHeight;
				});
			}
		};

		$scope.toggleEdit = function () {

			// if($scope.editOff==true)
			// {
			// 	if(vm.changePlanForm.$pristine && vm.changePlanForm.$dirty ){
			// 		var confirm = $mdDialog.confirm()
			// 			.title('Are you sure?')
			// 			.textContent('Fields have changed and you might have unsaved data. Are you sure you want to leave this page?')
			// 			.ariaLabel('Are you sure?')
			// 			.targetEvent()
			// 			.ok('Yes')
			// 			.cancel('Stay');
			//
			// 		$mdDialog.show(confirm).then(function() {
			// 			vm.changePlanForm.$pristine = false;
			// 			vm.changePlanForm.$dirty = false;
			// 			$scope.editOff = false;
			// 			vm.pageTitle = "Create Plan";
			// 		}, function() {
			// 		});
			// 	}else {
			// 		$scope.editOff = false;
			// 		vm.pageTitle = "Create Plan";
			// 	}
			// 	vm.activePlanPaneIndex = 0;
			// }
			// else
			// {
			$scope.editOff = true;
			vm.pageTitle = "View Plan";
			//skip=0;
			//$scope.items = [];
			//$scope.more();
			vm.activePlanPaneIndex = 1;
			$scope.showInpageReadpane = false;
			// }
		};

		$scope.sortBy = function(propertyName,status,property) {
			if(propertyName == 'unitPrice'){
				angular.forEach(vm.plans, function (plan) {
					plan.unitPrice = parseInt(plan.unitPrice);
				});
			}
			vm.plans=$filter('orderBy')(vm.plans, propertyName, $scope.reverse);
			$scope.reverse =!$scope.reverse;

			if(status!=null) {
				if(property=='Name')
				{
					$scope.showName = status;
					$scope.showCode = false;
					$scope.showDate = false;
					$scope.showPrice = false;
					$scope.showState = false;
				}
				if(property=='Code')
				{
					$scope.showName = false;
					$scope.showCode = status;
					$scope.showDate = false;
					$scope.showPrice = false;
					$scope.showState = false;
				}
				if(property=='Date')
				{
					$scope.showName = false;
					$scope.showCode = false;
					$scope.showDate = status;
					$scope.showPrice = false;
					$scope.showState = false;
				}
				if(property=='Price')
				{
					$scope.showName = false;
					$scope.showCode = false;
					$scope.showDate = false;
					$scope.showPrice = status;
					$scope.showState = false;
				}
				if(property=='Status')
				{
					$scope.showName = false;
					$scope.showCode = false;
					$scope.showDate = false;
					$scope.showPrice = false;
					$scope.showState = status;
				}
			}
		};

		$scope.showMoreUserInfo=false;
		$scope.contentExpandHandler = function () {
			$scope.reverseMoreLess =! $scope.reverseMoreLess;
			if($scope.reverseMoreLess){
				$scope.showMoreUserInfo=true;
			}else{
				$scope.showMoreUserInfo=false;
			}
		};

		$scope.showInpageReadpane = false;
		$scope.switchInfoPane = function (state, plan) {
			if(state=='show'){
				$scope.showInpageReadpane = true;
				$scope.showEmbedForm=false;
				$scope.$watch(function () {
					//vm.selectedPlan = plan;
				});
			}else if(state=='close'){
				if($scope.inpageReadPaneEdit){

				}else{
					$scope.showInpageReadpane = false;
					$scope.inpageReadPaneEdit=false;
				}
			}
		}

		$scope.isLoading = true;
		$scope.isdataavailable=true;
		$scope.hideSearchMore=false;

		var skip=0;
		var take=100;
		$scope.loading = true;

		$scope.more = function(selectedPlan, status){

			$scope.isLoading = true;
			//$charge.plan().allPlans(skip,take,'desc').success(function(data)
			//{
			//	console.log(data);
			//
			//	if($scope.loading)
			//	{
			//		skip += take;
			//
			//		for (var i = 0; i < data.length; i++) {
			//			$scope.items.push(data[i]);
			//		}
			//		vm.plans=$scope.items;
			//		//$timeout(function () {
			//		//  vm.plans=$scope.items;
			//		//},0);bofoxoc@evyush.com/dimezif@12hosting.net
			//		vm.searchMoreInit = false;
			//
			//		$scope.isLoading = false;
			//		$scope.loading = false;
			//		$scope.isdataavailable=true;
			//		if(data.length<take){
			//			$scope.isdataavailable=false;
			//			$scope.hideSearchMore=true;
			//		}
			//
			//	}
			//
			//}).error(function(data)
			//{
			//	console.log(data);
			//	$scope.isSpinnerShown=false;
			//	$scope.isdataavailable=false;
			//	$scope.loading = false;
			//	$scope.isLoading = false;
			//	$scope.hideSearchMore=true;
			//})

			var dbNamePart1="";
			var dbNamePart2="";
			var dbName="";
			var filter="";
			var data={};
			dbNamePart1=getDomainName().split('.')[0];
			dbNamePart2=getDomainExtension();
			dbName=dbNamePart1+"_"+dbNamePart2;
			//filter="api-version=2016-09-01&?search=*&$orderby=createdDate desc&$skip="+skip+"&$top="+take+"&$filter=(domain eq '"+dbName+"')";

			if(status=="")
			{
				data={
					"search": "*",
					"filter": "(domain eq '"+dbName+"')",
					"orderby" : "createdDate desc",
					"top":take,
					"skip":skip
				}
			}
			else
			{
				data={
					"search": "*",
					"filter": "(domain eq '"+dbName+"' and status eq '"+status+"')",
					"orderby" : "createdDate desc",
					"top":take,
					"skip":skip
				}
			}

			$charge.azuresearch().getAllPlansPost(data).success(function(data)
			{
				//console.log(data);

				if($scope.loading)
				{
					skip += take;

					for (var i = 0; i < data.value.length; i++) {
						$scope.items.push(data.value[i]);
					}
					$scope.$watch(function () {
						vm.plans=$scope.items;
					});
					//$timeout(function () {
					//  vm.plans=$scope.items;
					//},0);bofoxoc@evyush.com/dimezif@12hosting.net
					vm.searchMoreInit = false;

					$scope.isLoading = false;
					$scope.loading = false;
					$scope.isdataavailable=true;

					if(selectedPlan!="")
					{
						selectPlan(selectedPlan);
					}

					if(data.length<take){
						$scope.isdataavailable=false;
						$scope.hideSearchMore=true;
					}

				}

			}).error(function(data)
			{
				//console.log(data);
				$scope.isSpinnerShown=false;
				$scope.isdataavailable=false;
				$scope.loading = false;
				$scope.isLoading = false;
				$scope.hideSearchMore=true;
			})

		};
		// we call the function twice to populate the list
		//$scope.more("","");

		$scope.getCatLetter=function(catName){
			try{
				var catogeryLetter = "app/core/cloudcharge/img/material_alperbert/avatar_tile_"+catName.charAt(0).toLowerCase()+"_28.png";
			}catch(exception){}
			return catogeryLetter;
		};

		//$scope.loadUiShareData=[];

		$scope.onDropOne = function (data, event) {
			//console.log(data);

			// Get custom object data.
			var customObjectData= data['json/custom-object']; // {foo: 'bar'}

			$scope.setcustomObjectData={};
			$scope.setcustomObjectData=customObjectData;
			//$scope.setcustomObjectData.id=customObjectData.id;
			$scope.setcustomObjectData.image="app/core/cloudcharge/img/user.png";
			//$scope.setcustomObjectData.displayName=customObjectData.displayName;
			//$scope.setcustomObjectData.mail=customObjectData.mail;

			//console.log($scope.setcustomObjectData);
			// Get other attached data.
			var uriList = data['text/uri-list'];
			// console.log(uriList);

			for (var ind in $scope.selectedBasePlans)
			{
				//console.log($scope.selectedBasePlans[ind].code);

				if($scope.selectedBasePlans[ind].code == $scope.setcustomObjectData.code)
				{
					$scope.selectedBasePlans.splice(ind,1);
				}
			}
			$scope.selectedBasePlans.push($scope.setcustomObjectData);

		};

		$scope.deleteSelectedBasePlan= function(ev, data){
			//console.log(data);
			for (var ind in $scope.selectedBasePlans)
			{
				//console.log($scope.selectedBasePlans[ind].code);

				if($scope.selectedBasePlans[ind].code == data.code)
				{
					$scope.selectedBasePlans.splice(ind,1);
					//console.log($scope.selectedBasePlans);
				}
			}
		};

		$scope.clearform = function (){
			$scope.content={};
			vm.editSelectedPlan={};
			$scope.content.billingCycleType="auto";
			$scope.content.trailDays=30;
			billingCycleHandler("auto");
		}

		// Kasun_Wijeratne_8_5_2017
		$scope.embedHovered = false;
		$scope.closeEmbedForm = function () {
			$scope.embedFormCopied = false;
			window.getSelection().empty();
			$scope.showEmbedForm = false;
		}
		$scope.embedFormCopied = false;
		$scope.copyToClipboard = function () {
			window.getSelection().empty();
			var copyField = document.getElementById('embededCode');
			var range = document.createRange();
			range.selectNode(copyField);
			window.getSelection().addRange(range);
			document.execCommand('copy');
			$scope.embedFormCopied = true;
		}
		// Kasun_Wijeratne_8_5_2017
		$scope.closeDialog = function () {
			$mdDialog.hide();
		}

		function submitPlan (planForm){

			if(planForm == 'changePlanForm'){
				if (vm.changePlanForm.$valid == true) {
					vm.submitted=true;
					if($scope.content.billingCycleType=="auto")
					{
						$scope.content.billingCycle=-1;
					}

					if(!$scope.content.apply_tax)
					{
						$scope.content.taxID=null;
					}
					//$scope.content.unitPrice=JSON.stringify($scope.content.unitPrice);$scope.features
					$scope.content.rate=$scope.currencyRate;
					$scope.content.currency=$scope.BaseCurrency;

					//for (var i = 0; i < $scope.features.length; i++) {
					//	var priceSchemeObj=$scope.features[i];
					//	if(priceSchemeObj.type == "FIXED")
					//	{
					//		priceSchemeObj.scheme[0].type="FIXED";
					//		priceSchemeObj.scheme[0].unitsFrom=priceSchemeObj.unitsFrom;
					//		priceSchemeObj.scheme[0].unitsTo=priceSchemeObj.unitsTo;
					//		priceSchemeObj.scheme[0].unitUom=priceSchemeObj.unitUom;
					//		priceSchemeObj.scheme[0].price=priceSchemeObj.price;
					//		priceSchemeObj.scheme[0].uom=priceSchemeObj.uom;
					//		priceSchemeObj.scheme[0].autoTermination=priceSchemeObj.autoTermination;
					//		priceSchemeObj.scheme[0].costPerUnitAdd=priceSchemeObj.costPerUnitAdd!=undefined?priceSchemeObj.costPerUnitAdd:"";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//	else if(priceSchemeObj.type == "SLAB")
					//	{
					//		for (var j = 0; j < priceSchemeObj.scheme.length; j++) {
					//			var slabObj=priceSchemeObj.scheme[j];
					//			slabObj.type="SLAB";
					//			slabObj.costPerUnitAdd=slabObj.costPerUnitAdd!=undefined?slabObj.costPerUnitAdd:"";
					//		}
					//	}
					//	else if(priceSchemeObj.type == "optional")
					//	{
					//		priceSchemeObj.scheme[0].type="";
					//		priceSchemeObj.scheme[0].unitsFrom="";
					//		priceSchemeObj.scheme[0].unitsTo="";
					//		priceSchemeObj.scheme[0].unitUom="";
					//		priceSchemeObj.scheme[0].price="";
					//		priceSchemeObj.scheme[0].uom="";
					//		priceSchemeObj.scheme[0].autoTermination="";
					//		priceSchemeObj.scheme[0].costPerUnitAdd="";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//}

					var planObject = $scope.content;
					//console.log(planObject);
					$charge.plan().createPlan(planObject).success(function(data){
						//console.log(data);
						if(data.response=="succeeded")
						{
							notifications.toast("Successfully Plan Created","success");
							$scope.clearform();
							vm.submitted=false;

							$scope.editOff = false;
							vm.pageTitle = "Create Plan";

							//$scope.features=[];
							//$scope.addNewRow($scope.features);
							//$scope.loadAllPriceSchemeFeatures();
							//
							//$scope.selectedBasePlans=[];
							//skipBasePlans=0;
							//$scope.loadingBasePlans = true;
							//$scope.basePlanList=[];
							//$scope.loadAllBasePlans();

							skip=0;
							$scope.items = [];
							$scope.loading=true;
							vm.activePlanPaneIndex = 0;
							$scope.more("","");
							//$window.location.href='#/paymentlist';
						}
						else if(data.response=="failed")
						{
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");
								//$scope.errorlist=Response;
								//for(var i=0; i<$scope.errorlist.length; i++)
								//{
								//  var errmsg=$scope.errorlist[i];
								//  if(data.error[errmsg])
								//  {
								//    notifications.toast(data.error[errmsg][0],"error");
								//  }
								//}
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");

							//console.log(data);
							vm.submitted=false;
						}

					}).error(function(data){
						//
						if(data==201)
						{
							notifications.toast("Successfully Plan Created","success");
							vm.activePlanPaneIndex = 0;
							$scope.loading=true;
							$scope.more("","");
							$scope.clearform();
						}
						else if(data.response=="failed")
						{
							//for(var ermsg in data.error)
							//{
							//  notifications.toast(data.error[ermsg][0],"error");
							//}
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");
								//$scope.errorlist=Response;
								//for(var i=0; i<$scope.errorlist.length; i++)
								//{
								//  var errmsg=$scope.errorlist[i];
								//  if(data.error[errmsg])
								//  {
								//    notifications.toast(data.error[errmsg][0],"error");
								//  }
								//}
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");
						}
						else
						{
							notifications.toast("Error creating Plan","error");
							//console.log(data);
						}
						vm.submitted=false;
					})
				}else{
					angular.element('#changePlanForm').find('.ng-invalid:visible:first').focus();
				}
				//toggleinnerView('add');
			}
			else if(planForm == 'editPlanForm'){
				if (vm.editPlanForm.$valid == true) {
					vm.submitted=true;
					if(vm.editSelectedPlan.billingCycleType=="auto")
					{
						vm.editSelectedPlan.billingCycle=-1;
					}

					if(!vm.editSelectedPlan.apply_tax)
					{
						vm.editSelectedPlan.taxID=null;
					}
					//$scope.content.unitPrice=JSON.stringify($scope.content.unitPrice);
					//vm.editSelectedPlan.rate=$scope.currencyRate;

					//for (var i = 0; i < vm.editSelectedPlan.priceScheme.length; i++) {
					//	var priceSchemeObj=vm.editSelectedPlan.priceScheme[i];
					//	if(priceSchemeObj.type == "FIXED")
					//	{
					//		priceSchemeObj.scheme[0].type="FIXED";
					//		priceSchemeObj.scheme[0].unitsFrom=priceSchemeObj.unitsFrom;
					//		priceSchemeObj.scheme[0].unitsTo=priceSchemeObj.unitsTo;
					//		priceSchemeObj.scheme[0].unitUom=priceSchemeObj.unitUom;
					//		priceSchemeObj.scheme[0].price=priceSchemeObj.price;
					//		priceSchemeObj.scheme[0].uom=priceSchemeObj.uom;
					//		priceSchemeObj.scheme[0].autoTermination=priceSchemeObj.autoTermination;
					//		priceSchemeObj.scheme[0].costPerUnitAdd=priceSchemeObj.costPerUnitAdd!=undefined?priceSchemeObj.costPerUnitAdd:"";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//	else if(priceSchemeObj.type == "SLAB")
					//	{
					//		for (var j = 0; j < priceSchemeObj.scheme.length; j++) {
					//			var slabObj=priceSchemeObj.scheme[j];
					//			slabObj.type="SLAB";
					//			slabObj.costPerUnitAdd=slabObj.costPerUnitAdd!=undefined?slabObj.costPerUnitAdd:"";
					//		}
					//	}
					//	else if(priceSchemeObj.type == "optional")
					//	{
					//		priceSchemeObj.scheme[0].type="";
					//		priceSchemeObj.scheme[0].unitsFrom="";
					//		priceSchemeObj.scheme[0].unitsTo="";
					//		priceSchemeObj.scheme[0].unitUom="";
					//		priceSchemeObj.scheme[0].price="";
					//		priceSchemeObj.scheme[0].uom="";
					//		priceSchemeObj.scheme[0].autoTermination="";
					//		priceSchemeObj.scheme[0].costPerUnitAdd="";
					//
					//		for (var k = 1; k < priceSchemeObj.scheme.length; k++) {
					//			priceSchemeObj.scheme.splice(k, 1);
					//		}
					//	}
					//}

					var planObject = vm.editSelectedPlan;
					//console.log(planObject);
					$charge.plan().updatePlan(planObject).success(function(data){
						//console.log(data);
						if(data.response=="succeeded")
						{
							notifications.toast("Successfully Plan Modified","success");
							$scope.tempEditPlan=angular.copy(vm.editSelectedPlan);
							$scope.clearform();
							vm.submitted=false;

							//$scope.selectedBasePlans=[];
							//skipBasePlans=0;
							//$scope.loadingBasePlans = true;
							//$scope.basePlanList=[];
							//$scope.loadAllBasePlans();
							//$scope.selectedPlanFeaturesList=[];
							//for (var i = 0; i < $scope.priceSchemeFeatureList.length; i++) {
							//	if($scope.priceSchemeFeatureList[i].isSelected)
							//	{
							//		$scope.selectedPlanFeaturesList.push($scope.priceSchemeFeatureList[i][0]);
							//	}
							//}
							//$scope.loadAllPriceSchemeFeatures();

							skip=0;
							$scope.items = [];
							$scope.loading=true;
							vm.activePlanPaneIndex = 0;
							$scope.more($scope.tempEditPlan,"");
							$scope.cancelEdit();
							//selectPlan(vm.editSelectedPlan);
							//$window.location.href='#/paymentlist';
						}
						else if(data.response=="failed")
						{
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");

							//console.log(data);
							vm.submitted=false;
						}

					}).error(function(data){
						//
						//if(data==201)
						//{
						//  notifications.toast("Successfully Plan Modified","success");
						//  $scope.clearform();
						//}
						//else
						//{
						//  notifications.toast(data,"error");
						//  console.log(data);
						//}
						if(data.response=="failed")
						{
							$errorCheck.getClient().LoadErrorList(data.error).onComplete(function(Response)
							{
								var result=Response;
								notifications.toast(result,"error");
							}).onError(function(data)
							{
								//console.log(data);
							});
							//notifications.toast(data.error["STATUS_UNPROCESSABLE_ENTITY"][0],"error");
						}
						else
						{
							notifications.toast(data,"error");
						}
						//console.log(data);
						vm.submitted=false;
					})
				}else{
					angular.element('#editPlanForm').find('.ng-invalid:visible:first').focus();
				}
			}

		}

		$scope.searchKeyPress = function (event,keyword,length){
			if(event.keyCode === 13)
			{
				//console.log("Function Reached!");
				$scope.loadByKeywordPlan(keyword,length);
			}
		}

		var skipPlanSearch, takePlanSearch;
		var tempList;
		$scope.loadByKeywordPlan= function (keyword,length) {
			if($scope.items.length==100) {
				//
				if(length==undefined)
				{
					keyword="undefined";
					length=0;
				}
				var searchLength=length;
				//if(keyword.toLowerCase().startsWith($scope.expensePrefix.toLowerCase()))
				//{
				//  keyword=keyword.substr($scope.expensePrefix.length);
				//  console.log(keyword);
				//  searchLength=1;
				//}hirtocer@deyom.com

				if (keyword.length == searchLength) {
					//console.log(keyword);
					//
					skipPlanSearch = 0;
					takePlanSearch = 100;
					tempList = [];

					var dbName="";
					dbName=getDomainName().split('.')[0]+"_"+getDomainExtension();
					//filter="api-version=2016-09-01&?search=*&$orderby=createdDate desc&$skip="+skip+"&$top="+take+"&$filter=(domain eq '"+dbName+"')";
					var data={
						"search": keyword+"*",
						"searchFields": "code,name",
						"filter": "(domain eq '"+dbName+"')",
						"orderby" : "createdDate desc",
						"top":takePlanSearch,
						"skip":skipPlanSearch
					}


					$charge.azuresearch().getAllPlansPost(data).success(function (data) {
						for (var i = 0; i < data.value.length; i++) {
							tempList.push(data.value[i]);
						}
						vm.plans = tempList;
						//skipProfileSearch += takeProfileSearch;
						//$scope.loadPaging(keyword, skipProfileSearch, takeProfileSearch);
					}).error(function (data) {
						vm.plans = [];
					});
				}
				else if (keyword.length == 0 || keyword == null) {
					vm.plans = $scope.items;
				}

				if(searchLength==0||searchLength==undefined)
				{
					$scope.loading=true;
					$scope.more("","");
				}
			}
		}

		//function gst(name) {
		//	var nameEQ = name + "=";
		//	var ca = document.cookie.split(';');
		//	for (var i = 0; i < ca.length; i++) {
		//		var c = ca[i];
		//		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		//		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
		//	}
		//	//debugger;
		//	return null;
		//}
		$scope.baseUrl="";
		$http.get('app/core/cloudcharge/js/config.json').then(function(data){

			//console.log(data);
			$scope.baseUrl=data.data["plan"]["domain"];
			//$scope.loadFilterCategories('dashBoardReport.mrt');
			$scope.baseUrl=$scope.baseUrl.split('/')[2];
		}, function(errorResponse){
			//console.log(errorResponse);
			$scope.baseUrl="";
		});

		function getSecurityToken() {
			var _st = gst("SubscriptionKey");
			return (_st != null) ? _st : ""; //"248570d655d8419b91f6c3e0da331707 51de1ea9effedd696741d5911f77a64f";
		}

		$scope.fullEmbededPlanForm="";
		$scope.embededFormEnabled=false;
		$scope.getEmbededPlanForm= function (plan) {
			$scope.embededFormEnabled=true;

			// Kasun_Wijeratne_8_5_2017
			$scope.showEmbedForm = true;
			// Kasun_Wijeratne_8_5_2017

			var planDetailView = document.getElementById("plan-detail-view").innerHTML;
			angular.forEach([1,1,1], function () {
				planDetailView = planDetailView.toString().replace("✔", "&#10004");
				planDetailView = planDetailView.replace("<!-- ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 -->", "");
				planDetailView = planDetailView.replace("<!-- end ngIf: vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0 -->", "");
				planDetailView = planDetailView.replace('ng-if="vm.selectedPlan.trailDays > 1 || vm.selectedPlan.trailDays == 0" class="ng-scope"', "");
			});
			var startForm = "<form name='planEmbededSubscriptionForm' action='https://"+$scope.baseUrl+"/planEmbededForm/planSubscriptionScript.php/?method=subscriptionPlan' method='post' id='form1'>";
			var endForm = "<div style='padding: 20px 0;margin: 0 auto;overflow: hidden;max-width: 300px;width: 100%;text-align: center'><input type='hidden' name='emailAddress' id='emailAddress' placeholder='Email' style='width: 90%;height: 25px;padding: 5px;border-radius:5px;border: solid 1px #bbb;' /><br>" +
				"<input type='hidden' name='planCode' id='planCode' value='"+plan.code+"'><br>" +
				"<input type='hidden' name='paymentOption' id='paymentOption' value='"+plan.paymentOption+"'><br>" +
				"<input type='hidden' name='subscriptionKey' id='subscriptionKey' value='"+getSecurityToken()+"'><br>" +
				"<input type='hidden' name='mode' id='mode' value='"+getDomainExtension()+"'><br>" +
				"<button name='subscriptionButton' type='submit' value='submit' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: rgb(3,155,229);box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px;top: -45px;position: relative;'>Subscribe</button></div></body>";
			var scriptSubmit= "<script type='text/javascript'>" +
				"submitFormData = function(){" +
				//"var planCode=$post->planCode;" +
				//"var emailAdress=$post->emailAddress;" +
				//"var subscriptionKey=$post->subscriptionKey;" +
				"var planCode=document.getElementById('planCode').value;" +
				"var emailAdress=document.getElementById('emailAddress').value;" +
				"var paymentOption=document.getElementById('paymentOption').value;" +
				"var subscriptionKey=document.getElementById('subscriptionKey').value;" +
				"var mode=document.getElementById('mode').value;" +
				//"window.alert(planCode+' '+subscriptionKey);" +
				"}" +
				"</script></form>";
			//'models/portalservice.php/?method=payment&&data='+data+'&&meta='+queryString[1]

			var fullEmbededForm = startForm + planDetailView + endForm + scriptSubmit;

			$scope.fullEmbededPlanForm=fullEmbededForm;
		}

		$scope.nothingSelected = true;
		$scope.isNothingSelected = [];
		$scope.$watch(function () {
			$scope.isNothingSelected = [];
			angular.forEach($scope.priceSchemeFeatureList, function (feature) {
				if(feature.isSelected){
					$scope.isNothingSelected.push('ok');
				}
			});
			$scope.isNothingSelected.length == 0 ? $scope.nothingSelected = true : $scope.nothingSelected = false;

		});

	}
})();
