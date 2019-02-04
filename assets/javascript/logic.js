$(document).ready(function () {
    //#region - references and variables
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
    var userName;
    var messagesPath;
    var choicePath;
    var theChoice;
    var theString;
    var theWins = 0;
    var theLosses = 0;
    var theDraws = 0;
    var playerNumberOneOrTwo = "zero";
    var otherPlayerMapShown = false;
    var theNumberOnline;
    var theLastMessage;
    var geolocationStatusField = $("#geolocation-status");
    var map;
    var mapOtherPlayer;
    //#endregion

    //#region - buttons
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

    $(".radio-button").click(function () {
        theChoice = $("input[name='rock-paper-scissors']:checked").val();
        let imageUrl = "assets/images/" + theChoice + ".png";
        $("#icon-display-left").css('background-image', 'url(\'' + imageUrl + '\'');
    });

    $("#commit").click(function (event) {
        console.log("commit: " + theChoice + " as player " + playerNumberOneOrTwo);
        if (playerNumberOneOrTwo === "one") {
            database.ref(choicePath).update({
                playerOneChoice: theChoice,
            });
        } else {
            database.ref(choicePath).update({
                playerTwoChoice: theChoice,
            });
        };
        $("input[name='rock-paper-scissors']").attr('disabled', true);
    });
    //#endregion

    //#region - database references
    function initializeDatabaseReferences() {
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                // userID = user.uid;
                let shortUserID = Math.floor(Math.random() * 1000 + 1000);
                userName = prompt("Please enter a name to use for sending messages. If you don't choose one, we'll call you by this random number:", shortUserID);
                if (userName == null || userName.trim() == "") {
                    userName = shortUserID;
                };
                messagesPath = "messages";
                choicePath = "choice";
                getLocation();
                doAddEntry("connected");
            };
        });
    }

    initializeDatabaseReferences();

    database.ref(messagesPath).on("value", function (snapshot) {
        let theMessageDateTime = snapshot.child(messagesPath + "/dateTime/").val();
        let theMessageUserName = snapshot.child(messagesPath + "/userName/").val();
        let theMessageMessage = snapshot.child(messagesPath + "/message/").val();
        let theCurrentLat = parseFloat(snapshot.child(messagesPath + "/currentLat/").val());
        let theCurrentLong = parseFloat(snapshot.child(messagesPath + "/currentLong/").val());
        let theCurrentGeolocation = snapshot.child(messagesPath + "/currentGeolocation/").val();
        if (theMessageDateTime != null && theMessageDateTime + theMessageMessage != theLastMessage) {
            $("#message-display").prepend("<span class='monospace'>" + theMessageDateTime + " <strong>" + theMessageUserName + "</strong>:</span> " + theMessageMessage);
            theLastMessage = theMessageDateTime + theMessageMessage;
        };
        if ((theCurrentGeolocation != "lat: undefined, lng: undefined") && (theCurrentGeolocation != null)) {
            let theLatLong = { lat: theCurrentLat, lng: theCurrentLat };
            if (theMessageUserName === userName) {
                placeMarker(theLatLong, theMessageUserName);
            } else {
                if (otherPlayerMapShown === false && theNumberOnline > 1) {
                    showOtherPlayerMap(theCurrentLat, theCurrentLong);
                    otherPlayerMapShown = true;
                }
                placeMarkerOtherPlayer(theLatLong, theMessageUserName);
            };
        };
    }, function (errorObject) {
        console.log("entries-error: " + errorObject.code);
    });

    database.ref(choicePath).on("value", function (snapshot) {
        let playerOneChoice = (snapshot.child(choicePath + "/playerOneChoice/").val());
        let playerTwoChoice = (snapshot.child(choicePath + "/playerTwoChoice/").val());
        if (playerNumberOneOrTwo === "one" && playerTwoChoice != null) {
            setOtherPlayerStatus("made choice");
        };
        if (playerNumberOneOrTwo === "two" && playerOneChoice != null) {
            setOtherPlayerStatus("made choice");
        };

        if (playerOneChoice != null && playerTwoChoice != null) {
            database.ref(choicePath).set({
                playerOneChoice: null,
                playerTwoChoice: null,
            });
            declareWinner(playerOneChoice, playerTwoChoice);
        };
    }, function (errorObject) {
        console.log("entries-error: " + errorObject.code);
    });
    //#endregion

    //#region - miscellaneous functions
    function doAddEntry(automatic) {
        let todaysDate = new Date().toLocaleDateString("en-US");
        let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (automatic != "connected" && automatic != "disconnected") {
            var entryMessage = $("#input-message").val().trim() + "<br>";
        } else {
            if (automatic == "connected") {
                var entryMessage = "[connected]<br>";
            } else {
                var entryMessage = "[disconnected]<br>";
            };
        };
        database.ref(messagesPath).set({
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

    function emptyInputFields() {
        console.log("empty input fields");
        $("#input-message").val("");
        $("#message-display").text("");
        userName = "";
        messagesPath = "";
        choicePath = "";
        userLatitude;
        userLongitude;
        userLatLong;
        playerNumberOneOrTwo = "zero";
        theWins = 0;
        theLosses = 0;
        theDraws = 0;
    };
    //#endregion

    //#region - connections
    var connectionsRef = database.ref("/connections");
    var connectedRef = database.ref(".info/connected");

    connectedRef.on("value", function (connectedSnapshot) {
        if (connectedSnapshot.val()) {
            console.log("pushing connection to connected");
            var theConnection = connectionsRef.push(true);
            theConnection.onDisconnect().remove();
        };
    });

    connectionsRef.on("value", function (connectionsSnapshot) {
        theNumberOnline = connectionsSnapshot.numChildren();
        console.log("number online: " + connectionsSnapshot.numChildren());
        database.ref().child("connections").once("value", function (snapshot) {
        });
        if (playerNumberOneOrTwo !== "one") {
            if (theNumberOnline === 1) {
                setPlayerNumber(1);
            };
            if (theNumberOnline === 2) {
                setPlayerNumber(2);
            };
        };
        if (theNumberOnline > 2 && playerNumberOneOrTwo === "zero") {
            alert("The queue of players is full. If you leave this browser tab open, we'll update you when it is your turn to play!");
            setOtherPlayerStatus("queued")
        };
        if (theNumberOnline === 2) {
            setOtherPlayerStatus("connected")
        };
        console.log("player one or two: " + playerNumberOneOrTwo);
    });

    function setPlayerNumber(thePlayerNumber) {
        if (thePlayerNumber === 0) {
            playerNumberOneOrTwo = "zero";
            console.log("player zeroed");
            localStorage.playerNumber = "zero";
        };
        if (thePlayerNumber === 1) {
            playerNumberOneOrTwo = "one";
            localStorage.playerNumber = "one";
            setOtherPlayerStatus("waiting");
            database.ref(choicePath).set({ //wipe out any partial games
                playerOneChoice: null,
                playerTwoChoice: null,
            });
            database.ref(messagesPath).set({
                dateTime: null,
                userName: null,
                message: null,
                currentLat: null,
                currentLong: null,
                currentGeolocation: null
            });

        };
        if (thePlayerNumber === 2) {
            playerNumberOneOrTwo = "two";
            localStorage.playerNumber = "two";
            setOtherPlayerStatus("connected");
        };
    };

    firebase.auth().signInAnonymously().catch(function (error) {
        let errorCode = error.code;
        let errorMessage = error.message;
        console.log("anonymous login error: " + errorCode, errorMessage);
        // ...
    });

    function signOut() {
        playerNumberOneOrTwo === "zero";
        // doAddEntry("disconnected");
        firebase.auth().signOut();
        window.localStorage.removeItem("playerNumber");
        emptyInputFields();
        window.history.replaceState({}, document.title, window.location.href.split('?')[0]);//cleans up sign-in link params
        location = location;
    };

    function sendEmailLink(theEmailAddress) {
        let actionCodeSettings = {
            // URL must be whitelisted in the Firebase Console.
            'url': "https://desmondmullen.com/RPS-Multiplayer/",
            'handleCodeInApp': true // This must be true.
        };
        firebase.auth().sendSignInLinkToEmail(theEmailAddress, actionCodeSettings).then(function () {
            alert('An email was sent to ' + theEmailAddress + ' with a link to connect to this game.');
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
    // setInterval(function () { getLocation(); }, 300000); //<--- useful for mobile

    function showPosition(position) {
        userLatitude = parseFloat(position.coords.latitude);
        userLongitude = parseFloat(position.coords.longitude);
        if (initMapLatLong != userLatitude, userLongitude) {
            initMap();
        }
    }

    function initMap() {
        setTimeout(function () {
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
        if (playerNumberOneOrTwo !== "zero") {
            setTimeout(function () {
                console.log("other player map: " + theLatitude, theLongitude);
                initMapLatLong = theLatitude, theLongitude;
                var userLatLong = { lat: theLatitude, lng: theLongitude };
                mapOtherPlayer = new google.maps.Map(document.getElementById("map-right"), {
                    zoom: 16,
                    center: userLatLong
                });
                placeMarkerOtherPlayer(userLatLong, "Other Player");
            }, 500);
        };
    };

    function placeMarker(theLatLong, title) {
        var marker = new google.maps.Marker({
            position: theLatLong,
            map: map,
            title: title
        });
    };

    function placeMarkerOtherPlayer(theLatLong, title) {
        if (playerNumberOneOrTwo !== "zero") {
            var marker = new google.maps.Marker({
                position: theLatLong,
                map: mapOtherPlayer,
                title: title
            });
        };
    };
    //#endregion

    //#region - player status updates
    function declareWinner(playerOneChoice, playerTwoChoice) {// this can be shortened up
        theWinner = "";
        if (playerOneChoice === "rock" && playerTwoChoice === "rock") {
            theWinner = "draw";
        }
        if (playerOneChoice === "rock" && playerTwoChoice === "paper") {
            theWinner = "two";
        }
        if (playerOneChoice === "rock" && playerTwoChoice === "scissors") {
            theWinner = "one";
        }
        if (playerOneChoice === "paper" && playerTwoChoice === "rock") {
            theWinner = "one";
        }
        if (playerOneChoice === "paper" && playerTwoChoice === "paper") {
            theWinner = "draw";
        }
        if (playerOneChoice === "paper" && playerTwoChoice === "scissors") {
            theWinner = "two";
        }
        if (playerOneChoice === "scissors" && playerTwoChoice === "rock") {
            theWinner = "two";
        }
        if (playerOneChoice === "scissors" && playerTwoChoice === "paper") {
            theWinner = "one";
        }
        if (playerOneChoice === "scissors" && playerTwoChoice === "scissors") {
            theWinner = "draw";
        }
        if (playerNumberOneOrTwo === "one") {
            theString = "You picked " + playerOneChoice + " and the other player picked " + playerTwoChoice + ".";
        } else {
            theString = "You picked " + playerTwoChoice + " and the other player picked " + playerOneChoice + ".";
        };
        if (playerNumberOneOrTwo === theWinner) {
            theString = (theString + "\nYou won!");
            winLoseDraw = "win";
            theWins++;
        } else {
            if (theWinner === "draw") {
                theString = ("You both picked the same thing that round was a draw");
                winLoseDraw = "draw";
                theDraws++;
            } else {
                theString = (theString + "\nYou lost.");
                winLoseDraw = "lose";
                theLosses++;
            };
        };
        $("#message-display").prepend("<strong>You have won " + theWins + " and lost " + theLosses + " rounds. " + theDraws + " rounds were draws.</strong><br>");
        changeMessageDisplay(theString, winLoseDraw);
        setTimeout(function () {
            $("#other-player-status").html("Another player is connected");
            $("#other-player-status").removeClass();
            $("#other-player-status").addClass("connected");
            $("input[name='rock-paper-scissors']").attr('disabled', false);
        }, 500);
    };

    function changeMessageDisplay(message, theClass) {
        let theTextToPutBack = $("#message-display").html();
        $("#message-display").html(message);
        $("#message-display").removeClass("message-display");
        $("#message-display").addClass(theClass);
        setTimeout(function () {
            $("#message-display").html(theTextToPutBack);
            $("#message-display").removeClass(theClass);
            $("#message-display").addClass("message-display");
        }, 3000);
    };

    function setOtherPlayerStatus(status) {
        otherPlayerStatusField = $("#other-player-status");
        if (status === "waiting") {
            let theMessage = "Waiting for another player to connect<br>";
            setTimeout(function () {
                otherPlayerStatusField.html(theMessage);
                otherPlayerStatusField.removeClass();
                otherPlayerStatusField.addClass("waiting");
            }, 200);
            changeMessageDisplay(theMessage, "message-display-waiting")
        };
        if (status === "connected") {
            let theMessage = "Another player is connected<br>";
            otherPlayerStatusField.html(theMessage);
            otherPlayerStatusField.removeClass();
            otherPlayerStatusField.addClass("connected");
            changeMessageDisplay(theMessage, "message-display-connected")
        };
        if (status === "made choice") {
            otherPlayerStatusField.html("The other player has made a choice<br>");
            otherPlayerStatusField.removeClass();
            otherPlayerStatusField.addClass("made-choice");
        };
        if (status === "queued") {
            let theMessage = "<em>waiting in queue for next opening</em><br>"
            otherPlayerStatusField.html(theMessage);
            otherPlayerStatusField.removeClass();
            otherPlayerStatusField.addClass("queued");
            changeMessageDisplay(theMessage, "message-display-queued")
        };
    };
    //#endregion

    console.log("v1.5887");
});