var contacts = angular.module("contacts",[]);
contacts.controller("contactsCtrl",function($scope,$rootScope,$q,$timeout){
//Define Global variables
$scope.table = "Contacts";
$scope.curContact = {};
$rootScope.newContact = {};
$scope.initFoundation = function(){
	$(document).foundation();
	$(document).on("formvalid.zf.abide", function(ev,frm) {
	  $scope.createItem();		
	});
}
AWS.config.update({
  region: "us-east-1"
});

// AWS Cognito Credentials
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
IdentityPoolId: "us-east-1:16130cbe-db3c-4de5-ab2a-2fd780f841b1",
RoleArn: "arn:aws:iam::950057700910:role/Cognito_contactsspaUnauth_Role"
});

//Initialize DynamoDB API
var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

$scope.getFullList = function(){
	scanData().then(function(list){
		$scope.fullList = list;
		$scope.maxClientID = Math.max.apply(Math,$scope.fullList.map(function(contact){return contact.client_id;}));
		$scope.whileLoading = false;
	});
}
//Get complete list of Contacts
$scope.whileLoading = true;
$scope.getFullList();
//Function to Add a Contact
$scope.createItem = function createItem() {
    var params = {
        TableName :$scope.table,
        Item:{
            "client_id": $scope.maxClientID+1,
            "first_name": $rootScope.newContact.first_name,
            "last_name": $rootScope.newContact.last_name,
            "email": $rootScope.newContact.email,
            "phone": $rootScope.newContact.phone,
            "status": $rootScope.newContact.status
        }
    };
	//AWS - DynamoDB - Put Item
    docClient.put(params, function(err, data) {
        if (err) {
            $scope.actionStatus = "alert";
            $scope.actionResult = "Contact cannot be added. Please retry.";
        } else {
            $scope.actionStatus = "success";
            $scope.actionResult = "Contact added successfully.";
			$rootScope.newContact = {};
            $scope.getFullList();
        }
    });
}
//Function to fetch a Contact
$scope.readItem = function(cId,fName){
    var params = {
        TableName: $scope.table,
        Key:{
            "client_id":cId,
            "first_name":fName
        }
    };
	//AWS - DynamoDB - Get Item 
    docClient.get(params, function(err, data) {
        if (err) {
            //Error
        } else {
            $scope.curContact = data.Item;
            $timeout(function () {
                $scope.$apply();
                $('#contactCard').foundation('open');
				$scope.actionStatus = "";
				$scope.actionResult = "";
            }, 0);
        }
    });
}
//Function to update a Contact
$scope.updateItem = function updateItem() {
    var table = $scope.table;
    var params = {
        TableName:table,
        Key:{
            "first_name":$scope.curContact.first_name,
            "client_id":$scope.curContact.client_id
        },
        UpdateExpression: "set last_name=:lname, email = :email, phone = :phone, #contactStatus = :status",
        ExpressionAttributeNames: {
            "#contactStatus": "status"
        },
        ExpressionAttributeValues:{
            ":lname":$scope.curContact.last_name,
            ":email":$scope.curContact.email,
            ":phone":$scope.curContact.phone,
            ":status":$scope.curContact.status
        },
        ReturnValues:"UPDATED_NEW"
    };
    //AWS - DynamoDB - Update Item 
    docClient.update(params, function(err, data) {
        if (err) {
            $scope.actionStatus = "alert";
            $scope.actionResult = "Contact cannot be updated at this time. Please try later.";
        } else {
            $scope.actionStatus = "success";
            $scope.actionResult = "Contact updated successfully.";
            $scope.getFullList();
        }
    });
}

//Function to delete a Contact.
$scope.deleteItem = function deleteItem() {
    var table = $scope.table;

    var params = {
        TableName:table,
        Key:{
            "first_name":$scope.curContact.first_name,
            "client_id":$scope.curContact.client_id
        }
    };
	//AWS - DynamoDB - Delete Item 
    docClient.delete(params, function(err, data) {
        if (err) {
            $scope.actionStatus = "alert";
            $scope.actionResult = "Contact cannot be deleted at this time. Please try later.";
        } else {
            $scope.actionStatus = "success";
            $scope.actionResult = "Contact deleted successfully.";
            $timeout(function () {
                $('#contactCard').foundation('close');
				$scope.actionStatus = '';
            }, 2000);
            $scope.getFullList();
        }
    });
}

//Function for fetch all the contacts
function scanData() {
    var deferred = $q.defer();
    var params = {
        TableName: $scope.table,
        ProjectionExpression: "client_id,first_name,last_name,email,phone,#currentStatus",
        ExpressionAttributeNames: {
            "#currentStatus": "status"
        }
    };
	//AWS - DynamoDB - Fetch all Items
    docClient.scan(params, onScan);

    function onScan(err, data) {
        if (err) {
			$scope.errorLoading = true;
			$scope.whileLoading = false;
        } else {
            deferred.resolve(data.Items);

            // Continue scanning if we have more contacts (per scan 1MB limitation)
            //params.ExclusiveStartKey = data.LastEvaluatedKey;
            //docClient.scan(params, onScan);
        }
    }
    return deferred.promise;
}
//Function for search filter
$scope.search = function(item){
	if($scope.searchKey == undefined){
		return true;
	}else{
		if(item.first_name.toLowerCase().indexOf($scope.searchKey.toLowerCase()) != -1 ||
		   item.last_name.toLowerCase().indexOf($scope.searchKey.toLowerCase()) != -1 ||
		   item.email.toLowerCase().indexOf($scope.searchKey.toLowerCase()) != -1 ||
		   item.phone.toString().toLowerCase().indexOf($scope.searchKey.toLowerCase()) != -1){
			return true;
		}
	}
	return false;
}
});
