$(document).ready(function () {
    var config = {
        apiKey: "AIzaSyCguBj_V-Q-Y-adGj7Gk8kwazSxVO3bf3c",
        authDomain: "dsm-rps-multiplayer.firebaseapp.com",
        databaseURL: "https://dsm-rps-multiplayer.firebaseio.com",
        projectId: "dsm-rps-multiplayer",
        storageBucket: "dsm-rps-multiplayer.appspot.com",
        messagingSenderId: "539490820354"
    };
    firebase.initializeApp(config);

    var database = firebase.database();
    var userID;
    var userSignedIn;
    var userName;
    var userIdentificationPath;
    var userInstancesPath;
    var userMessagesPath;
    var userChoicePath;
    var theChoice;
    var playerNumberOneOrTwo;
    var otherPlayerMapShown = false;
    var theNumberOnline;
    var theLastMessage;
    var geolocationStatusField = $("#geolocation-status");
    var map;
    var mapOtherPlayer;

    $(".add-entry").on("click", function (event) {
        event.preventDefault();
        doAddEntry();
    });

    $("#send-link").on("click", function () {
        let theEmailAddressToSendLinkTo = prompt("Please enter the email address to send the link to:");
        if (theEmailAddressToSendLinkTo != null) {
            sendEmailLink(theEmailAddressToSendLinkTo);
        }
    });

    $("#sign-out").on("click", function () {
        signOut();
        emptyInputFields();
    });

    function doAddEntry(automatic) {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log("do add entry:" + automatic + ", userID is: " + userID);
        if (automatic != "connected" && automatic != "disconnected") {
            var entryMessage = $("#input-message").val().trim() + "<br>";
        } else {
            if (automatic == "connected") {
                var entryMessage = "[connected]<br>";
            } else {
                var entryMessage = "[disconnected]<br>";
            };
        };
        database.ref(userMessagesPath).set({
            dateTime: todaysDate + " " + currentTime,
            userName: userName,
            message: entryMessage,
            currentLat: userLatitude,
            currentLong: userLongitude,
            currentGeolocation: "lat: " + userLatitude +
                ", lng: " + userLongitude
        });
        $("#input-message").val("");
    };

    database.ref(userMessagesPath).on("value", function (snapshot) {
        let theMessageDateTime = snapshot.child(userMessagesPath + "/dateTime/").val();
        let theMessageUserName = snapshot.child(userMessagesPath + "/userName/").val();
        let theMessageMessage = snapshot.child(userMessagesPath + "/message/").val();
        let theCurrentLat = parseFloat(snapshot.child(userMessagesPath + "/currentLat/").val());
        let theCurrentLong = parseFloat(snapshot.child(userMessagesPath + "/currentLong/").val());
        let theCurrentGeolocation = snapshot.child(userMessagesPath + "/currentGeolocation/").val();
        if (theMessageDateTime != null && theMessageDateTime + theMessageMessage != theLastMessage) {
            $("#message-display").prepend("<span class='monospace'>" + theMessageDateTime + " <strong>" + theMessageUserName + "</strong>:</span> " + theMessageMessage);
            theLastMessage = theMessageDateTime + theMessageMessage;
        };
        if ((theCurrentGeolocation != "lat: undefined, lng: undefined") && (theCurrentGeolocation != null)) {
            let theLatLong = { lat: theCurrentLat, lng: theCurrentLat };
            if (theMessageUserName === userName) {
                placeMarker(theLatLong, theMessageUserName);
            } else {
                if (otherPlayerMapShown === false) {
                    showOtherPlayerMap(theCurrentLat, theCurrentLong);
                    otherPlayerMapShown = true;
                }
                placeMarkerOtherPlayer(theLatLong, theMessageUserName);
            };
        };
    }, function (errorObject) {
        console.log("entries-error: " + errorObject.code);
    });

    database.ref(userChoicePath).on("value", function (snapshot) {
        let playerOneChoice = (snapshot.child(userChoicePath + "/playerOneChoice/").val());
        let playerTwoChoice = (snapshot.child(userChoicePath + "/playerTwoChoice/").val());
        if (playerOneChoice != "" && playerTwoChoice != "") {
            declareWinner(playerOneChoice, playerTwoChoice);
            database.ref(userChoicePath).set({
                playerOneChoice: "",
                playerTwoChoice: "",
            });
        };
    }, function (errorObject) {
        console.log("entries-error: " + errorObject.code);
    });

    function emptyInputFields() {
        console.log("empty input fields");
        $("#input-message").val("");
        $("#message-display").text("");
        userID = "";
        userSignedIn = "";
        userName = "";
        userIdentificationPath = "";
        userInstancesPath = "";
        userMessagesPath = "";
        userChoicePath = "";
        userLatitude;
        userLongitude;
        userLatLong;
    };

    //#region - connections
    var connectionsRef = database.ref("/connections");
    var connectedRef = database.ref(".info/connected");

    connectedRef.on("value", function (connectedSnapshot) {
        if (connectedSnapshot.val()) {
            var theConnection = connectionsRef.push(true);
            theConnection.onDisconnect().remove();
        };
    });
    connectionsRef.on("value", function (connectionsSnapshot) {
        theNumberOnline = connectionsSnapshot.numChildren();
        if (theNumberOnline > 2 && playerNumberOneOrTwo === undefined) {
            alert("please wait to play, there are users ahead of you.");
        } else {
            if (playerNumberOneOrTwo === undefined) {
                if (theNumberOnline === 1) {
                    playerNumberOneOrTwo = 1;
                    console.log("you are player one");
                    database.ref(playersPath).update({
                        playerOne: (+new Date()),
                    });
                } else {
                    if (theNumberOnline === 2) {
                        playerNumberOneOrTwo = 2;
                        console.log("you are player two");
                        database.ref(playersPath).update({
                            playerTwo: (+new Date()),
                        });
                    };
                };
            };
        };
        if (theNumberOnline > 2 && playerNumberOneOrTwo !== undefined) {
            alert("other players are waiting to play, please sign out after you have played a few rounds.");
        };
        console.log("number online: " + connectionsSnapshot.numChildren());
    }); // Number of online users is the number of objects in the presence list.

    firebase.auth().signInAnonymously().catch(function (error) {
        let errorCode = error.code;
        let errorMessage = error.message;
        console.log("anonymous login error: " + errorCode, errorMessage);
        // ...
    });

    function turnURLIntoUserInstancesPath(theLink) {
        console.log("turn URL into user instances path");
        if (theLink == null || path == "" || path == undefined) {
            theLink = window.location.href;
        }
        window.localStorage.setItem("theLastURLParameters", theLink);
        window.history.replaceState({}, document.title, window.location.href.split('?')[0]);//cleans up sign-in link params
        let theInstancesPath = (theLink.substring((theLink.indexOf("?") + 1), theLink.indexOf("&")));
        if (theInstancesPath != null) {
            userInstancesPath = decodeURIComponent(theInstancesPath);
            userMessagesPath = userInstancesPath + "/messages";
            console.log("new path: " + decodeURIComponent(theInstancesPath));
        } else {
            console.log("new path was null, existing path is: " + userInstancesPath);
        };
    };

    function signOut() {
        if (playerNumberOneOrTwo === 1) {
            database.ref(playersPath).update({
                playerOne: null,
            });
        } else {
            if (playerNumberOneOrTwo === 2) {
                database.ref(playersPath).update({
                    playerTwo: null,
                });
            };
        };
        doAddEntry("disconnected");
        firebase.auth().signOut();
        userSignedIn = false;
        window.localStorage.removeItem("userInstancesPath");
        emptyInputFields();
        window.history.replaceState({}, document.title, window.location.href.split('?')[0]);//cleans up sign-in link params
        location = location;
    };

    function sendEmailLink(theEmailAddress) {
        let actionCodeSettings = {
            // URL must be whitelisted in the Firebase Console.
            'url': "https://desmondmullen.com/RPS-Multiplayer/?" + userInstancesPath,
            'handleCodeInApp': true // This must be true.
        };
        firebase.auth().sendSignInLinkToEmail(theEmailAddress, actionCodeSettings).then(function () {
            window.localStorage.setItem("userInstancesPath", userInstancesPath);
            alert('An email was sent to ' + theEmailAddress + '. This instance can be accessed by anyone using the link in that email.');
        }).catch(function (error) {
            handleError(error);
        });
    }

    function handleError(error) {
        let errorCode = error.code;
        let errorMessage = error.message;
        alert('Error: ' + errorMessage);
        console.log("handle error: " + errorCode, errorMessage);
    }
    //#endregion

    function initializeDatabaseReferences() {
        let localStorageUIPath = window.localStorage.getItem("userInstancesPath");
        let localStorageLastURLParams = window.localStorage.getItem("theLastURLParameters");
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                console.log("auth state changed: " + user.uid);
                userID = user.uid; //when connecting by link, this will be the same user
                let shortUserID = Math.floor(Math.random() * 1000 + 1000);
                userName = prompt("Please enter a name to use for sending messages. If you don't choose one, we'll call you by this random number:", shortUserID);
                if (userName == null || userName.trim() == "") {
                    userName = shortUserID;
                };
                // User is signed in.
                userSignedIn = true;
                userIdentificationPath = "users/" + userID + "/identification";
                if (window.location.href.indexOf("?") > 0) {
                    turnURLIntoUserInstancesPath();
                    console.log("user ID after signout: " + userID);
                } else {
                    if (localStorageUIPath != null) {
                        console.log("restoring userInstancePath from local storage");
                        userInstancesPath = localStorageUIPath;
                    } else {
                        userInstancesPath = "users/" + userID + "/instances/" + (+new Date());
                    }
                    userMessagesPath = userInstancesPath + "/messages";
                }
                userChoicePath = userInstancesPath + "/choice";
                playersPath = userInstancesPath + "/players";

                if (localStorageLastURLParams != null) {
                    turnURLIntoUserInstancesPath(localStorageLastURLParams);
                };
                getLocation();
                setTimeout(function () {
                    doAddEntry("connected");
                }, 2000);
            };
        });
    }

    initializeDatabaseReferences();

    //#region - geolocation
    var userLatitude;
    var userLongitude;
    var initMapLatLong;
    var mapDisplayFieldLeft = $("#map-left");
    var mapDisplayFieldRight = $("#map-right");

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition);
        } else {
            geolocationStatusField.text("Geolocation is not supported by this browser");
        }
    }

    getLocation();
    setInterval(function () { getLocation(); }, 300000);

    function showPosition(position) {
        userLatitude = parseFloat(position.coords.latitude);
        userLongitude = parseFloat(position.coords.longitude);
        if (initMapLatLong != userLatitude, userLongitude) {
            console.log("redoing initMap: " + initMapLatLong + " / " + userLatitude, userLongitude);
            initMap();
        }
    }

    function initMap() {
        setTimeout(function () {
            console.log("init map: " + userLatitude, userLongitude);
            initMapLatLong = userLatitude, userLongitude;
            var userLatLong = { lat: userLatitude, lng: userLongitude };
            map = new google.maps.Map(document.getElementById("map-left"), {
                zoom: 16,
                center: userLatLong
            });
            placeMarker(userLatLong, "You are here");
            geolocationStatusField.text("Latitude: " + userLatitude + ", Longitude: " + userLongitude);
        }, 500);
    }

    function showOtherPlayerMap(theLatitude, theLongitude) {
        setTimeout(function () {
            console.log("other player map: " + theLatitude, theLongitude);
            initMapLatLong = theLatitude, theLongitude;
            var userLatLong = { lat: theLatitude, lng: theLongitude };
            mapOtherPlayer = new google.maps.Map(document.getElementById("map-right"), {
                zoom: 16,
                center: userLatLong
            });
            placeMarker(userLatLong, "Other Player");
        }, 500);
    }

    //#endregion

    function placeMarker(theLatLong, title) {
        var marker = new google.maps.Marker({
            position: theLatLong,
            map: map,
            title: title
        });
    }

    function placeMarkerOtherPlayer(theLatLong, title) {
        var marker = new google.maps.Marker({
            position: theLatLong,
            map: mapOtherPlayer,
            title: title
        });
    }

    $(".radio-button").click(function () {
        theChoice = $("input[name='rock-paper-scissors']:checked").val();
        let imageUrl = "assets/images/" + theChoice + ".png";
        $("#icon-display-left").css('background-image', 'url(\'' + imageUrl + '\'');
    });

    $("#commit").click(function (event) {
        console.log("commit: " + theChoice + " as player " + playerNumberOneOrTwo);
        if (playerNumberOneOrTwo === 1) {
            database.ref(userChoicePath).update({
                playerOneChoice: theChoice,
            });
        } else {
            database.ref(userChoicePath).update({
                playerTwoChoice: theChoice,
            });
        };
        $("input[name='rock-paper-scissors']").attr('disabled', true);
    });

    function declareWinner(playerOneChoice, playerTwoChoice) {
        alert("declare winner: " + playerOneChoice + ", " + playerTwoChoice);
        setTimeout(function () {
            $("input[name='rock-paper-scissors']").attr('disabled', false);
        }, 500);
    };

    console.log("v1.31");
});