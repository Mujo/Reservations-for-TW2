// Reservations for TW2
var reservations = window.reservations = (function() {
	var debug = true,
		reservGroupIcons = [1802, 2570],
		grpReserv,
		grpMyReserv,
		charId,
		charName,
		worldId,
		dbversion = 1;

	var log = function() {
		if (debug)
			console.log.apply(console, arguments);
	};

	// Database
	var db = function() {
		return {
			messages: {},
			reservations: {}
		};
	} ();

	var loadDB = function() {
		log("loading reservDB...");
		var player;
		checkIfLoaded(function() {
			player = window.modelDataService.getPlayer();
			if (player && player.data)
				return true;
			else
				return false;
		}, function() {
			var charData = player.data.selectedCharacter.data;
			charId = charData.character_id;
			charName = charData.character_name;
			worldId = charData.world_id;
			var localDbMsgs = localStorage["reservDB_v" + dbversion + "_" + worldId + "_" + charId];
			db = (localDbMsgs) ? JSON.parse(localDbMsgs) : db;
			log("reservDB loaded.");
		});
	}

	var saveDB = function() {
		log("saving reservDB...");
		localStorage["reservDB_v" + dbversion + "_" + worldId + "_" + charId] = JSON.stringify(db);
		log("reservDB saved.");
	}

	// SET Services and Handlers
	var loadServices = function() {
		window.modelDataService = window.injector.get('modelDataService');
		window.groupService = window.injector.get('groupService');
		window.eventTypeProvider = window.injector.get('eventTypeProvider');
		window.messagingService = window.injector.get('messagingService');
	}

	var setNewHandlers = function() {
		newMessageHandler();
		openGroupsHandler();
		attachGroupHandler();
		dettachGroupHandler();
		messageViewHandler();
	}

	// Handlers
	var newMessageHandler = function() {
		window.BottomInterfaceController = window.angular.element($('[ng-controller="BottomInterfaceController"]')).scope();
		window.BottomInterfaceController.$on(window.eventTypeProvider.MESSAGE_NEW, onNewMessage);
	}

	var openGroupsHandler = function() {
		window.gameOpenGroupsIndexModal = window.groupService.openGroupsIndexModal;
		window.groupService.openGroupsIndexModal = function(villageId, villageName) {
			window.gameOpenGroupsIndexModal(villageId, villageName);
			onOpenGroupsIndexModal(villageId, villageName);
		};
	};

	var attachGroupHandler = function() {
		window.gameAttachGroupToVillage = window.groupService.attachGroupToVillage;
		window.groupService.attachGroupToVillage = function(groupId, villageId) {
			var success = onAttachGroupToVillage(groupId, villageId);
			if (success) window.gameAttachGroupToVillage(groupId, villageId);
		}
	}

	var dettachGroupHandler = function() {
		window.gameDettachGroupFromVillage = window.groupService.dettachGroupFromVillage;
		window.groupService.dettachGroupFromVillage = function(groupId, villageId) {
			var success = onDettachGroupFromVillage(groupId, villageId);
			if (success) window.gameDettachGroupFromVillage(groupId, villageId);
		}
	}

	var messageViewHandler = function() {
		window.gameOpenMessage = window.messagingService.openMessage;
		window.messagingService.openMessage = function(id) {
			window.gameOpenMessage(id);
			onOpenMessage(id);
		}
	}

	var onOpenMessage = function(id) {
		checkIfLoaded('[ng-controller="MessageViewController"]', function() {
			window.MessageViewController = window.angular.element($('[ng-controller="MessageViewController"]')).scope();
			window.MessageViewController.$on(window.eventTypeProvider.MESSAGE_VIEW, onMessageLoaded);
		});
	}

	// Messages
	var onMessageLoaded = function(event, data) {
		log("onMessageView", event, data);
		checkIfLoaded('[ng-controller="MessageViewController"] ul.list-center', function() {
			var msg_owner = (data.author_id === charId);
			var msg = db.messages[data.message_id];
			var reservMsgBtn = $(".reserv-msg-btn");
			var reservActive = reservMsgBtn.children(":first");
			if (!reservMsgBtn.length) {
				$('[ng-controller="MessageViewController"] ul.list-center')
					.append('<li>&nbsp;<span class="reserv-msg-btn icon-60x60-tab-noble" style="height:40px;"></span></li>');
				reservMsgBtn = $(".reserv-msg-btn");
				reservMsgBtn.append('<span style="position:absolute;left:-1px;bottom:-4px;"></span>');
				reservActive = reservMsgBtn.children(":first");
				reservActive.addClass("icon-26x26-checkbox" + ((msg && msg.active) ? "-checked" : ""));
			}
			reservMsgBtn.off("click");
			if (msg_owner) {
				reservMsgBtn.click(function() {
					reservActive.toggleClass("icon-26x26-checkbox").toggleClass("icon-26x26-checkbox-checked");
					db.messages[data.message_id] = msg = msg || {
						id: data.message_id,
						title: data.title,
						author_id: data.author_id,
						active: 0,
						last: data.message_count - 1
					};
					msg.active = reservActive.attr("class")[0].split(" ").find(i => i == "icon-26x26-checkbox-checked") ? 1 : 0;
					var send_msg;
					if (msg.active) {
						send_msg = "/startreserv ";
						window.messagingService.reply(msg.id, send_msg + hash(send_msg + JSON.stringify(msg)));
					} else {
						if (confirm("Do you like to exclude all reserves from this message? This action can not be undone!")) {
							send_msg = "/cleanreserv ";
							delete db.messages[data.message_id];
							var timeout = (2000 + Math.round(Math.random() * 4000));
							for (var vid in db.reservations) {
								var isMine = db.reservations[vid].char.id === charId;
								if (db.reservations[vid].msg_id === data.message_id) {

									setTimeout(function(isMine, dettachVillage, myReservId, reservId, villageId) {
										if (isMine) {
											dettachVillage(myReservId, villageId);
										} else {
											dettachVillage(reservId, villageId);
										}
									}, timeout, isMine, window.gameDettachGroupFromVillage, grpMyReserv.id, grpReserv.id, vid);
									delete db.reservations[vid];
									timeout += (2000 + Math.round(Math.random() * 4000));
								}
							}
						} else {
							send_msg = "/stopreserv ";
						}
						window.messagingService.reply(msg.id, send_msg + hash(send_msg + JSON.stringify(msg)));
					}

					saveDB();
				});
			}
		});
	}

	var onNewMessage = function(event, data) {

		var options = {
			params: data.message.content.trim().split(" "),
			char_id: data.message.character_id,
			char_name: data.message.character_name,
			msg_id: data.message_id,
			title: data.title,
			last: data.message_count - 1
		};

		execCommand(options);
	}

	var execCommand = function(options) {

		var village_id, dt, sec_hash, reserv, msg, reservMsgBtn, reservActive;
		var command = options.params[0].slice(1);
		switch (command) {
			case "addreserv":
				village_id = unzip(options.params[1]);
				dt = unzip(options.params[2]);
				sec_hash = options.params[3];
				if (db.reservations[village_id]) break;
				reserv = {
					dt: dt,
					char: {
						id: options.char_id,
						name: options.char_name
					},
					msg_id: options.msg_id
				};
				log("addreserv", village_id, dt, sec_hash, reserv);
				if (sec_hash === hash("/addreserv " + zip(village_id) + " " + zip(dt) + " " + JSON.stringify(reserv))) {
					db.reservations[village_id] = reserv;
					saveDB();
					window.gameAttachGroupToVillage(grpReserv.id, village_id);
				}
				break;

			case "remreserv":
				village_id = unzip(options.params[1]);
				sec_hash = options.params[2];
				if (!db.reservations[village_id]) break;
				reserv = db.reservations[village_id];
				log("remreserv", village_id, sec_hash, reserv, options.char_id);
				if (sec_hash === hash("/remreserv " + zip(village_id) + " " + JSON.stringify(reserv)) && reserv.char.id === options.char_id) {
					delete db.reservations[village_id];
					saveDB();
					window.gameDettachGroupToVillage(grpReserv.id, village_id);
				}
				break;

			case "startreserv":
				msg = {
					id: options.msg_id,
					title: options.title,
					author_id: options.char_id,
					active: 1,
					last: options.last
				};
				sec_hash = options.params[1];
				log("startreserv", sec_hash, msg);
				if (sec_hash === hash("/startreserv " + JSON.stringify(msg))) {
					db.messages[options.msg_id] = msg;
					saveDB();
					if ($(".reserv-msg-btn").length) {
						reservMsgBtn = $(".reserv-msg-btn");
						reservActive = reservMsgBtn.children(":first");
						reservActive.removeClass("icon-26x26-checkbox").addClass("icon-26x26-checkbox-checked");
					}
				}
				break;

			case "stopreserv":
				msg = db.messages[options.msg_id];
				if (!msg) break;
				sec_hash = options.params[1];
				log("stopreserv", sec_hash, msg);
				if (sec_hash === hash("/stopreserv " + JSON.stringify(msg)) && msg.author_id === options.char_id) {
					msg.active = 0;
					saveDB();
					if ($(".reserv-msg-btn").length) {
						reservMsgBtn = $(".reserv-msg-btn");
						reservActive = reservMsgBtn.children(":first");
						reservActive.addClass("icon-26x26-checkbox").removeClass("icon-26x26-checkbox-checked");
					}
				}
				break;

			case "cleanreserv":
				msg = db.messages[options.msg_id];
				if (!msg) break;
				sec_hash = options.params[1];
				log("cleanreserv", sec_hash, msg);
				if (sec_hash === hash("/cleanreserv " + JSON.stringify(msg)) && msg.author_id === options.char_id) {
					delete db.messages[options.msg_id];
					var timeout = (2000 + Math.round(Math.random() * 4000));
					for (var vid in db.reservations) {
						var isMine = db.reservations[vid].char.id === charId;
						if (db.reservations[vid].msg_id === options.msg_id) {
							setTimeout(function(isMine, dettachVillage, myReservId, reservId, villageId) {
								if (isMine) {
									dettachVillage(myReservId, villageId);
								} else {
									dettachVillage(reservId, villageId);
								}
							}, timeout, isMine, window.gameDettachGroupToVillage, grpMyReserv.id, grpReserv.id, vid);
							delete db.reservations[vid];
							timeout += (2000 + Math.round(Math.random() * 4000));
						}
					}
					saveDB();
					if ($(".reserv-msg-btn").length) {
						reservMsgBtn = $(".reserv-msg-btn");
						reservActive = reservMsgBtn.children(":first");
						reservActive.addClass("icon-26x26-checkbox").removeClass("icon-26x26-checkbox-checked");
					}
				}
				break;
		}
	}

	var readNewMessages = function() {
		var newMessages = Object.keys(window.BottomInterfaceController.gameDataModel.data.newMessages);

		for (var m in newMessages) {
			window.messagingService.openMessage(parseInt(m));
			checkIfLoaded('[ng-controller="MessageViewController"]', function() {
				window.MessageViewController = window.angular.element($('[ng-controller="MessageViewController"]')).scope();
				var conversation = window.MessageViewController.conversation;
				window.MessageViewController.loadPosts(conversation, true, true);

				checkIfLoaded(function() {
					conversation = window.MessageViewController.conversation;
					return conversation.messages.length === conversation.messageCount;
				},
					function() {
						var msg = db.messages[m];

						conversation.messages.filter((_, i) => i > (msg.last || -1)).forEach(e => {
							msg = db.messages[m];
							var options = {
								params: e.content.trim().split(" "),
								char_id: e.author.id,
								char_name: e.author.name,
								msg_id: m,
								title: conversation.title,
								last: conversation.messageCount - 1
							};

							execCommand(options);
						});
					});
			});
		}
	}

	// Groups
	var setGroups = function() {
		var grps = window.groupService.getGroups();
		var grpsKeys = Object.keys(grps);
		checkIfLoaded(
			function() {
				grps = window.groupService.getGroups();
				grpsKeys = Object.keys(grps);
				return grpsKeys.length > 0;
			},
			function() {
				getGroups(grps);
				if (!grpMyReserv || !grpReserv) {
					log("groups not found.");
					if (grpsKeys.length > 8) {
						log("no space for new groups.");
						if (confirm("Reservations for TW2 needs 2 space for new groups. Do you like to delete the last ones?")) {
							log("deleting the last ones groups.");
							grpsKeys.slice(8).forEach(e => window.groupService.destroyGroup(e));
						}
					}
					log("creating groups...");
					window.groupService.createGroup(reservGroupIcons[0], "My Reserve");
					window.groupService.createGroup(reservGroupIcons[1], "Reserved");

					grps = window.groupService.getGroups();
					getGroups(grps);
				}
			});
	}

	var getGroups = function(groups) {
		for (var g in groups) {
			var grp = groups[g];
			switch (grp.icon) {
				case reservGroupIcons[0]:
					grpMyReserv = grp;
					break;
				case reservGroupIcons[1]:
					grpReserv = grp;
					break;
			}
		}
		if (grpMyReserv && grpReserv)
			log("groups found:", grpMyReserv, grpReserv);
	}

	var onAttachGroupToVillage = function(groupId, villageId) {
		log("onAttachGroupToVillage", groupId, villageId);
		if (grpMyReserv.id != groupId) return true;
		var msg_id = parseInt($("#reservMsgs").val());
		if (!msg_id) {
			$("#reservMsgs").attr('disabled', 'disabled');
			return true;
		}
		// save 
		var reserv = db.reservations[villageId] = {
			dt: Date.now(),
			char: {
				id: charId,
				name: charName
			},
			msg_id: msg_id
		};
		saveDB();

		// propagate reservation for message
		var msg = "/addreserv " + zip(villageId) + " " + zip(reserv.dt) + " ";
		window.messagingService.reply(reserv.msg_id, msg + hash(msg + JSON.stringify(reserv)));

		$("#reservMsgs").attr('disabled', 'disabled');
		return true;
	}

	var onDettachGroupFromVillage = function(groupId, villageId) {
		log("onDettachGroupFromVillage", groupId, villageId);
		if (grpMyReserv.id != groupId) return true;
		$("#reservMsgs").removeAttr('disabled');

		// propagate delete for message
		var reserv = db.reservations[villageId];
		if (reserv) {
			var msg = "/remreserv " + zip(villageId) + " ";
			window.messagingService.reply(reserv.msg_id, msg + hash(msg + JSON.stringify(reserv)));
		}

		delete db.reservations[villageId];
		saveDB();
		return true;
	}

	var onOpenGroupsIndexModal = function(villageId, villageName) {
		setGroups();
		log("onOpenGroupsIndexModal", villageId, villageName);
		checkIfLoaded(".groups-index .box-paper .col-third", function() {
			$(".groups-index .box-paper .col-third")
				.append('<br/><table class="tbl-border-light">'
				+ '<thead><tr><th class="ng-binding">Reserve message:</th></tr></thead>'
				+ '<tbody><tr class="ng-scope"><td><span class="ng-binding"><select id="reservMsgs" /></span></td></tr></tbody>'
				+ '</table>');
			$("#reservMsgs").css({ width: "278px" });
			$("#reservMsgs").append('<option value="0">No reserve message set</option>');
			log("fetching messages with reservations.");
			for (var m in db.messages) {
				var msg = db.messages[m];
				log(msg);
				if (msg.active) {
					$("#reservMsgs").append('<option value="' + msg.id + '">' + msg.title + '</option>');
				}
			}
			var reserv = db.reservations[villageId];
			if (reserv || window.groupService.getVillageGroups(37042).find(f => f.id === grpMyReserv.id || f.id === grpReserv.id)) {
				$("#reservMsgs").attr('disabled', 'disabled').val((reserv) ? reserv.msg_id : 0);
			}
		});
	}

	var cleanDB = function() {
		for (var r in db.reservations) {
			var msg_id = db.reservations[r].msg_id;
			if (!db.messages[msg_id])
				delete db.reservations[r];
		}
		saveDB();
	}

	var eraseOldLocalDB = function() {
		Object.keys(localStorage).filter(f => f.indexOf("reservDB_") > -1 && f.indexOf("reservDB_v" + dbversion + "_") < 0).forEach(e => localStorage.removeItem(e));
	}

	// Init
	var init = function() {
		checkIfLoaded('[ng-controller="BottomInterfaceController"]',
			function() {
				log("loading Reservations for TW2...");
				loadServices();
				loadDB();
				eraseOldLocalDB();
				cleanDB();
				setNewHandlers();
				setGroups();
				log("Reservations for TW2 loaded.");
			});
	}

	return {
		Init: init,
		get DB() { return db; }
	}

})();

reservations.Init();

// reservations list example:
//[b][color=0111af][size=medium]RESERVAS:[/size] [br][br][/color][/b][b]B. Wolf[br][/b][village=17051]Império Leal - VII (488|393)[/village][br][b][br]pooh1[br][/b][village=19625]Camp 04 (484|400)[/village][br][b][br]FGOES[br][/b][village=30045]VI Marcelor (490|391)[/village][br][b][br]Rodrigo Barbaro 001[br][/b][village=17050]danispk68-3 (483|392)[/village] noblada [br][b][br]gerotto[br][/b][village=13756]danispk68-4 (483|396)[/village][br][village=13751]V Distrito de Marcelo I (482|401)[/village][br][village=13728]IV Capitania de Marcelo I (484|401)[/village][br][b][br]DullBoy[br][/b][village=29164]V  Provincia de Marcelo (484|394)[/village][br][b][br]K4m4l[/b][br][village=29587]XII GROTOVISK (479|393)[/village][br][b][br]felicosta[br][/b][village=13733]VII Marcelor (488|389)[/village][br][village=27668]IIIProvíncia de Marcelo I (486|398)[/village][br][b][br]Romops[br][/b][village=24569]Capitania de Marcelo I (466|383)[/village][br][village=33855]II Distrito Marcelo I (467|384)[/village][br][b][br]Ancient Felipe[br][/b][village=18098]Aldeia de Anderson felipelli (485|391)[/village][br][b][br]Joanna Dark[br][/b][village=15856]03. EraModern (486|396)[/village][br][village=32630]IV Distrito de Marcelo I (482|382)[/village][br][b][br]Jon Rakar[br][/b][village=30046]Aldeia Bárbara (484|391)[/village][br][b][br]geison neno[br][/b][village=30013]III Condado de Marcelo (475|393)[/village][br][br][b]vladgmania[/b][br][village=26608]II Província de Marcelo I (487|400)[/village][br][village=27649]IV Província de Marcelo I (487|398)[/village] 