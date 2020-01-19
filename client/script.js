$(document).ready(function() {
	var domHeight = document.body.scrollHeight
	var hasMsg = false // to check whether there is some value in the input message field, so that once there is a value in the input message field, we need not check again on "keyup". We only need to check once there is no value in the input message field.

	var flag = true

	/* SECTION - DOM Caching */
	$userRegistration = $('#userRegistration')
	$registeredUser = $('#registeredUser')
	$users = $('#users')
	$chats = $('#chats')
	$sentMessage = $('#sentMessage')
	$hitSend = $('#hitSend')
	$clearChat = $('#clearChat')
	$regUserSubmitBtn = $('#regUserSubmitBtn')
	$typeMsgSection = $('#typeMsgSection')
	$registeredUser.focus() // giving the user name input field the cursor.

	WebSocket.prototype.emit = function(event, data) {
		this.send(JSON.stringify({ event, data }))
	}

	WebSocket.prototype.listen = function(eventName, callback) {
		this._socketListeners = this._socketListeners || {}
		this._socketListeners[eventName] = callback
	}

	const socketClient = new WebSocket('ws://localhost:9876/server')

	socketClient.onopen = function() {
		console.log(`WebSocket is live`)
		if ($chats.html() == 0) {
			$clearChat.attr('disabled', true)
		}
		$hitSend.attr('disabled', true)
	}

	socketClient.onmessage = function(e) {
		try {
			const { event, data } = JSON.parse(e.data)
			socketClient._socketListeners[event](data)
		} catch (error) {
			// not for our app
		}
	}

	/* SECTION - User typing the message */
	$sentMessage.on('keyup', function() {
		if ($(this).val()) {
			//$("#noMsgErr").hide();
			$hitSend.attr('disabled', false)

			if (!hasMsg) {
				hasMsg = true // if there is some value in the input message field, we need not check again.
				socketClient.emit('addTypingUsers')
			}
		} else {
			$hitSend.attr('disabled', true)
			hasMsg = false // if there is some value in the input message field, we might check again until there is some value.
			// if there is no value in the input message field, remove the current user from "Typing users" list.
			socketClient.emit('removeTypingUsers')
		}
	})
	/* SECTION - Sending a new Message */
	$hitSend.on('click', function(event) {
		event.preventDefault()
		let msg = $sentMessage.val()
		if (msg == '') {
			//$("#noMsgErr").show();
			return
		}
		$sentMessage.val('')
		socketClient.emit('oldMessage', { msg })
		hasMsg = false
		// once the message is sent, remove the name of the user from "Typing users" list.
		socketClient.emit('removeTypingUsers')
		$('.peopleTyping').text('Type Message:  ')
	})
	/* SECTION - Clear Chat */
	$clearChat.on('click', function() {
		$clearChat.attr('disabled', true) // disabling the clear chats button.
		$sentMessage.focus() // setting cursor on input field.
		flag = true
		domHeight = document.body.scrollHeight
		// remove scroll bar, height, padding slowly from the chats section.
		$chats.animate(
			{
				height: '0px',
				'overflow-y': 'hidden',
				'padding-right': '0px'
			},
			'slow',
			function() {
				$chats.removeAttr('style')
				$chats.empty()
			}
		)
		$typeMsgSection.css({
			'margin-top': '0px'
		})
		$('.peopleTyping').text('Type Message:  ')
	})
	/* SECTION - User Registration */
	$regUserSubmitBtn.on('click', function() {
		window.currentUser = $registeredUser.val()
		if (currentUser == '') {
			alert('please enter a name')
			return
		}
		socketClient.emit('thisUser', { user: currentUser, onlineStatus: 'green' })
		$registeredUser.val('')
		$userRegistration.fadeOut('slow', function() {
			// remove the user registration section and show chats section on the page
			$('.chat-section').fadeIn('slow')
			// activating the jquery emoji picker
			$sentMessage.emojiPicker({
				position: 'right'
			})
			var $emojiPickerDiv = $('#typeMsgSection > div')[0]
			$emojiPickerDiv.style.width = '100%'
			// taking care of the UI gliches that come when jquery-emoji-picker is installed
			// makes the 'text' input take the width of the div it is enclosed in
			$sentMessage[0].style.width = '100%'
			// makes the 'text' input responsive
			$sentMessage[0].style.display = 'flex'
			// to put the cursor on "#sentMessage" input text field
			$sentMessage.focus()
		})
	})

	/* SECTION - Appending new message */
	socketClient.listen('newMessage', function(data) {
		let prevOffsetTop = 0,
			currOffsetTop = 0
		if ($chats.html() == '') {
			prevOffsetTop = $typeMsgSection.offset.top
        }
        
		$chats
			.append(
				'<div class="well well-sm" style="font-size: 18px">' +
					'<strong>' +
					data.user +
					': </strong>' +
					data.msg +
					'</div>'
			)
			.fadeIn('slow')

		$chats.scrollTop($chats[0].scrollHeight)
		if ($chats.contents().length == 1) {
			currOffsetTop = $typeMsgSection.offset.top
		}
		$typeMsgSection.css({
			'margin-top': '15px'
		})
		// when the user sends a message, the "chats" section must become fixed at the end of the page. Hence, we scrolled the window down. (params : (x, y) // x = document.boyd.scrollwidth, y = document.body.scrollHeight)
		//window.scrollTo(0, document.body.scrollHeight);
		//console.log('domHeight', domHeight);
		if (
			flag &&
			$typeMsgSection.offset().top +
				$typeMsgSection.height() +
				parseInt($typeMsgSection.css('margin-top')) +
				parseInt($('body').css('margin-top')) +
				currOffsetTop -
				prevOffsetTop >=
				domHeight
		) {
			$chats.css({
				'overflow-y': 'scroll', // giving the chats section a scroll bar.
				'padding-right': '10px', // padding at the side of scroll bar.
				height:
					$typeMsgSection.position().top -
					parseInt($('body').css('margin-top')) -
					parseInt($typeMsgSection.css('margin-top'))
			})
			$chats.scrollTop($chats[0].scrollHeight)
			flag = false
		}

		$clearChat.attr('disabled', false)
	})
	/* SECTION - user Online/Away - making the current user "Away" once the fouce on the browser tab is shifted*/
	$(window).blur(function() {
		// sending the server an event that will change the current users status to "Away" on server level.
		socketClient.emit('updateUserStatus', 'yellow')
		return
	})
	/* SECTION - user Online/Away - making the current user "Online" once the focus on the browser tab is back. */
	$(window).focus(function() {
		// sending the server an event that will change the current users status to "Away" on server level.
		socketClient.emit('updateUserStatus', 'green')
		return
	})
	/* SECTION - showing online users */
	socketClient.listen('all-Users', function(obj) {
		let html = ''
        let imgSrc = '' // variable to store the source of either "Yellow dot" or "Green dot" (for Online/Away symbol).
		for (let i = 0; i < obj.length; i++) {
			if (obj[i].status == 'green') {
				imgSrc =
					' <img src="https://upload.wikimedia.org/wikipedia/commons/1/1d/Online_dot.png" alt="online-green-dot" height="8px" width="8px"/> '
			} else {
				imgSrc =
					' <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Yellow_Dot_by_DraGoth.png/600px-Yellow_Dot_by_DraGoth.png" alt="online-green-dot" height="8px" width="8px"/> '
			}
			html += '<li class="list-group-item"> ' + imgSrc + obj[i].user + '</li>'
		}
		$users.empty()
		$users.append(html)
	})
	/* SECTION - showing typing users */
	socketClient.listen('showTypingUsers', function(data) {
		let str = '' // will store the names of users currently typing. (If their no. is less than 3)
		var cnt = 0 // variable that stores the number of people currently typing other than the current user.
		data.forEach(function(obj) {
			if (obj.user != currentUser) {
				str += obj.user + ', '
				cnt++
			}
		})
		str = str.substring(0, str.length - 2)
		if (cnt == 0) {
			$('.peopleTyping').text('Type Message: ')
		} else if (cnt == 1) {
			$('.peopleTyping').text('Type Message:  ' + str + ' is typing...')
		} else if (cnt == 2) {
			$('.peopleTyping').text('Type Message:  ' + str + ' are typing...')
		} else {
			$('.peopleTyping').text('Type Message:  ' + cnt + ' people are typing...')
		}
	})
})
