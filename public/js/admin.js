// To-do
// Add scroll to load more messages for Admins

// Initialize variables
var $window = $(window);
var $newUser = $('#windowSound')[0];
var $newChat = $('#chatSound')[0];
var $pokeAdmin = $('#pokeSound')[0];
var $usernameInput = $('.usernameInput'); // Input for username
var $passwordInput = $('.passwordInput'); //Input for password
var $loginPage = $('.login.page'); // The login page
var $errorPage = $('.error.page'); // The error page
var $chatPage = $('.chat.page'); // The chat page
var $userList = $('.adminList'); // List of online admins
var $inputMessage; // Input message input box
var $messages; // Messages area
var $inputRadio; //Input Radio Buttons for bot and admin

var username;	//Store admin username
var authenticated = false; //Boolean to check if admin is authenticated 
var connected = false; 
var typing = false; //Boolean to check if admin is typing
var timeout = undefined; //Timeout to monitor typing
var socket = io(); //io socket
$newUser.loop = true;
$usernameInput.focus();
Notification.requestPermission();

socket.on('login', function(data) {
	console.log("In Login Socket");
	$userList.empty();
	authenticated = data.login;
	if (authenticated) {
		$loginPage.fadeOut();
		$chatPage.show();
		socket.emit('add admin', {
			admin: username,
			isAdmin: true
		});
		$userList.append('<li id=' + username + '>' + username + '</li>');
		connected = true;
	} else {
		alert(data.err);
		$usernameInput.val('');
		$passwordInput.val('');
		username = null;
		$usernameInput.focus();
	}
})


/**
 * This function is used to generate messages when bot is selected on admin window.
 * It interacts with the backend through ajax calls
 * 
 * @param {object} [data]
 * @public
 */
function processMessage(data) {

	//console.log("Inside processMessage function");
	let url = "http://localhost:3000/api/message";

	//Send the Client Message to NLP server using post 
	let posting = $.post(url, { message: data.msg });

	//Return the Message received from NLP Server back to Client if not null
	posting.done(function(dataIn){
		if(dataIn !== "null"){
			data.msg = dataIn;
			sendAutoMessage(data.roomID, data.msg);
			clearTimeout(timeout);
			timeoutFunction(data.roomID);
		}
	})
	.fail(function(){
		alert("Some problem getting data from backend");
	})

}

socket.on('chat message', function(data) {
	console.log("Admin chat message");

	$inputMessage = $('#' + data.roomID);
	var $parent = $inputMessage.parent();
	var $messages = $parent.children(".messages");

	if (data.isAdmin)
		var $usernameDiv = $('<span class="username"/>').text("CronJ");
	else
		var $usernameDiv = $('<span class="username"/>').text("Client");

	var $messageBodyDiv = $('<span class="messageBody">').text(data.msg);
	var $timestampDiv = $('<span class="timestamp">').text((data.timestamp).toLocaleString().substr(15, 6));
	var $messageDiv = $('<li class="message"/>').append($usernameDiv, $messageBodyDiv, $timestampDiv);
	$messages.append($messageDiv);
	$messages[0].scrollTop = $messages[0].scrollHeight;
	$newChat.play();

	//Check to see if bot is selected or not
	var radioValue = $("input[name='"+data.roomID+"']:checked").val();

	//If bot is selected, then only execute processMessage function
	if(radioValue === 'bot'){
		processMessage(data);
	}
});

socket.on('admin added', function(username) {
	console.log("In Admin added Socket");
	$userList.append('<li id=' + username + '>' + username + '</li>');
	adminListListener(username);
})

socket.on('admin removed', function(username) {
	console.log("In Admin removed Socket");
	$('#' + username).remove();
})

socket.on('New Client', function(data) {
	console.log("New Client added Socket");
	
	$('.container').append(getChatArea(data.roomID));
	$inputMessage = $('#' + data.roomID);
	$inputRadio =$("input[name='"+data.roomID+"']");
	var $parent = $inputMessage.parent();
	var $messages = $parent.children(".messages");
	var $chatHeader = $parent.children(".chatHeader");
	var len = data.history.length;
	$chatHeader.append(data.details[0] + " , " + data.details[1] + " , " + data.details[2]);
	var sender;
	for (var i = len - 1; i >= 0; i--) {
		if (data["history"][i]["who"])
			sender = "You"
		else
			sender = "Client"
		var $usernameDiv = $('<span class="username"/>').text(sender);
		var $messageBodyDiv = $('<span class="messageBody">').text(data["history"][i]["what"]);
		var $timestampDiv = $('<span class="timestamp">').text((data["history"][i]["when"]).toLocaleString().substr(15, 6));
		var $messageDiv = $('<li class="message"/>').append($usernameDiv, $messageBodyDiv, $timestampDiv);
		$messages.append($messageDiv);
		$messages[0].scrollTop = $messages[0].scrollHeight;
	}
	if (!data.justJoined) {
		$newUser.play();
		notifyAdmin("New Client", "Hey there!" + data.details[0] + " needs help!");
		$parent.css('border', '2px solid red')
		$inputMessage = $('#' + data.roomID);
		$inputMessage.on("focus", function() {
			$newUser.pause();
			$parent.css('border', '1px solid black')
			$inputMessage.off('focus');
			socket.emit('client ack', {});
		});
	}

	var clientData = { clientID: data.roomID };
	$inputRadio.bind('change', clientData, function(e){
		checkControl(e);
	});

	$inputMessage.on('keypress', function() {
		isTyping();
	});
})

socket.on('typing', function(data) {
	console.log("Admin is Typing in Socket");
	$inputMessage = $('#' + data.roomID);
	var $parent = $inputMessage.parent();
	var $typing = $parent.children(".typing");
	if (data.isTyping)
		$typing.append("<small>" + data.person + " is typing...<small>");
	else
		$typing.text('');
})

socket.on('client ack', function() {
	$newUser.pause();
})

socket.on('User Disconnected', function(roomID) {
	$newUser.pause();
	$inputMessage = $('#' + roomID);
	$inputMessage.off();
	var $parent = $inputMessage.parent();
	$parent.remove();
})

socket.on('poke admin', function() {
	$pokeAdmin.play();
})

socket.on('reconnect', function() {
	console.log("Reconnected!");
	$userList.empty();
	$('.container').empty();
	$errorPage.fadeOut();
	$userList.append('<li id=' + username + '>' + username + '</li>');
	if (authenticated)
		socket.emit('add admin', {
			admin: username,
			isAdmin: true
		});
});

socket.on('disconnect', function() {
	console.log("Disconnected!");
	$errorPage.show();
});

socket.on('reconnect_failed', function() {
	console.log("Reconnection Failed!");
	var $errorMsg = $errorPage.children(".title")
	$errorMsg.text("Reconection Failed. Please refresh your page. ")
	$window.alert("Disconnected from chat.")
});

$passwordInput.keypress(function(event) {
	if (event.which === 13)
		setUsername();
});


/**
 * When admin is selected, this function is used to send the message to the client
 * 
 * @param {String} id 
 * @public
 */
function sendMessage(id) {
	$inputMessage = $('#' + id);
	var $parent = $inputMessage.parent();
	var $messages = $parent.children(".messages");
	var message = $inputMessage.val();

	// Prevent markup from being injected into the message
	message = cleanInput(message);
	// if there is a non-empty message and a socket connection
	if (message && connected) {
		$inputMessage.val('');
		// tell server to execute 'new message' and send along one parameter
		var time = ("" + new Date());
		socket.emit('chat message', {
			roomID: id,
			msg: message,
			timestamp: time
		});
		var $usernameDiv = $('<span class="username"/>').text("You");
		var $messageBodyDiv = $('<span class="messageBody">').text(message);
		var $timestampDiv = $('<span class="timestamp">').text(time.toLocaleString().substr(15, 6));
		var $messageDiv = $('<li class="message"/>').append($usernameDiv, $messageBodyDiv, $timestampDiv);
		$messages.append($messageDiv);
		$messages[0].scrollTop = $messages[0].scrollHeight;
	}
}


/**
 *When bot is selected, this function is used to send the message to the client
 *
 * @param {String} id
 * @param {String} message
 * @public
 */ 
function sendAutoMessage(id, message) {
	$inputMessage = $('#' + id);
	var $parent = $inputMessage.parent();
	var $messages = $parent.children(".messages");

	// Prevent markup from being injected into the message
	message = cleanInput(message);
	// if there is a non-empty message and a socket connection
	if (message && connected) {
		$inputMessage.val('');
		// tell server to execute 'new message' and send along one parameter
		var time = ("" + new Date());
		socket.emit('chat message', {
			roomID: id,
			msg: message,
			timestamp: time
		});
		var $usernameDiv = $('<span class="username"/>').text("You");
		var $messageBodyDiv = $('<span class="messageBody">').text(message);
		var $timestampDiv = $('<span class="timestamp">').text(time.toLocaleString().substr(15, 6));
		var $messageDiv = $('<li class="message"/>').append($usernameDiv, $messageBodyDiv, $timestampDiv);
		$messages.append($messageDiv);
		$messages[0].scrollTop = $messages[0].scrollHeight;
	}
}


function isTyping() {
	console.log("Admin is typing in function isTyping()");
	var id = event.target.id;
	if (event.which !== 13 && event.which !== undefined) {
		if (typing === false && $('#' + id).is(":focus")) {
			typing = true;
			socket.emit("typing", {
				isTyping: true,
				roomID: id,
				person: username
			});
		} else {
			clearTimeout(timeout);
			timeout = setTimeout(function() {
				timeoutFunction(id);
			}, 2000);
		}
	} else {
		sendMessage(id);
		clearTimeout(timeout);
		timeoutFunction(id);
	}
}

function timeoutFunction(id) {
	typing = false;
	socket.emit("typing", {
		isTyping: false,
		roomID: id,
		person: username
	});
}

function adminListListener(target) {
	$('#' + target).on('click', function() {
		var pokeAdmin = event.target.id;
		socket.emit('poke admin', pokeAdmin);
	});
}

function getChatArea(id) {
	return ("<div class='chatArea'><div class='chatHeader'></div>" + 
		"<div id='cblist' class='chatControl'><input type='radio' name='" + id +"' value='bot' id='rb1' checked='checked'/><label for='rb1'>Bot</label>" +
		"<input type='radio' name='" + id + "' value='admin' id='rb2' /><label for='rb2'>Admin</label></div>" +
		"<ul class='messages'></ul><div class='typing'></div><input class='inputMessage' id='" + id + "'' placeholder='Type here...'/></div>");
}

function setUsername() {
	username = cleanInput($usernameInput.val().trim());
	username = username.toLowerCase();
	password = $passwordInput.val();
	if (username) {
		// If the username is valid
		socket.emit('login', {
			admin: username,
			password: password
		});
	}
}

function notifyAdmin(title, body) {
	if (Notification.permission !== "granted")
		Notification.requestPermission();
	else {
		var notification = new Notification(title, {
			icon: '',
			body: body,
		});
		notification.onclick = function() {
			$window.focus();
			this.cancel();
		}
	}
}

// Prevents input from having injected markup
function cleanInput(input) {
	return $('<div/>').text(input).text();
}

function checkControl(e){

	console.log(e);
	var nameId = e.data.clientID;
	var result = $("input[name='" + nameId + "']:checked").val();
	$inputMessage = $('#' + nameId);
	
	if(result === 'bot'){
		$inputMessage.attr("disabled", "disabled");
	}else{
		$inputMessage.removeAttr("disabled");
	}

}