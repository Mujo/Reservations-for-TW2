﻿// Reservations for TW2
var reservations = window.reservations = (function () {
	var debug = true,
		reservGroupIcons = [1290, 2570],
		grpReserv,
		grpMyReserv,
		charId,
		charName,
		worldId;

	var log = function () {
		if (debug)
			console.log.apply(console, arguments);
	};
	
	// DATABASE
	var db = function () {
		return {
			messages: {},
			reservations: {}
		};
	} ();

	var loadDB = function () {
		log("loading reservDB...");
		var player;
		checkIfLoaded(function () {
			player = window.modelDataService.getPlayer();
			if (player && player.data)
				return true;
			else
				return false;
		}, function () {
			var charData = player.data.selectedCharacter.data;
			charId = charData.character_id;
			charName = charData.character_name;
			worldId = charData.world_id;
			var localDbMsgs = localStorage["reservDB_" + worldId + "_" + charId];
			db = (localDbMsgs) ? JSON.parse(localDbMsgs) : db;
			log("reservDB loaded.");
		});
	}

	var saveDB = function () {
		log("saving reservDB...");
		localStorage["reservDB_" + worldId + "_" + charId] = JSON.stringify(db);
		log("reservDB saved.");
	}
	
	// SET Services and Handlers
	var loadServices = function () {
		window.modelDataService = window.injector.get('modelDataService');
		window.groupService = window.injector.get('groupService');
		window.eventTypeProvider = window.injector.get('eventTypeProvider');
		window.messagingService = window.injector.get('messagingService');
	}

	var setNewHandlers = function () {
		newMessageHandler();
		openGroupsHandler();
		attachGroupHandler();
		dettachGroupHandler();
		messageViewHandler();
	}


	// Handlers
	var newMessageHandler = function () {
		window.BottomInterfaceController = window.angular.element($('[ng-controller="BottomInterfaceController"]')).scope();
		window.BottomInterfaceController.$on(window.eventTypeProvider.MESSAGE_NEW, onNewMessage);
	}

	var openGroupsHandler = function () {
		window.gameOpenGroupsIndexModal = window.groupService.openGroupsIndexModal;
		window.groupService.openGroupsIndexModal = function (villageId, villageName) {
			window.gameOpenGroupsIndexModal(villageId, villageName);
			onOpenGroupsIndexModal(villageId, villageName);
		};
	};

	var attachGroupHandler = function () {
		window.gameAttachGroupToVillage = window.groupService.attachGroupToVillage;
		window.groupService.attachGroupToVillage = function (groupId, villageId) {
			var success = onAttachGroupToVillage(groupId, villageId);
			if (success) window.gameAttachGroupToVillage(groupId, villageId);
		}
	}

	var dettachGroupHandler = function () {
		window.gameDettachGroupFromVillage = window.groupService.dettachGroupFromVillage;
		window.groupService.dettachGroupFromVillage = function (groupId, villageId) {
			var success = onDettachGroupToVillage(groupId, villageId);
			if (success) window.gameDettachGroupFromVillage(groupId, villageId);
		}
	}

	var messageViewHandler = function () {
		window.gameOpenMessage = window.messagingService.openMessage;
		window.messagingService.openMessage = function (id) {
			window.gameOpenMessage(id);
			onOpenMessage(id);
		}
	}

	var onOpenMessage = function (id) {
		checkIfLoaded('[ng-controller="MessageViewController"]', function () {
			window.MessageViewController = window.angular.element($('[ng-controller="MessageViewController"]')).scope();
			window.MessageViewController.$on(window.eventTypeProvider.MESSAGE_VIEW, onMessageLoaded);
		});
	}

	// Messages
	var onMessageLoaded = function (event, data) {
		log("onMessageView", event, data);
		checkIfLoaded('[ng-controller="MessageViewController"] ul.list-center', function () {
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
				reservMsgBtn.click(function () {
					reservActive.toggleClass("icon-26x26-checkbox").toggleClass("icon-26x26-checkbox-checked");
					db.messages[data.message_id] = msg = msg || {
						id: data.message_id,
						title: data.title,
						author_id: data.author_id,
						active: 0
					};
					msg.active = reservActive.attr("class")[0].split(" ").find(i => i == "icon-26x26-checkbox-checked") ? 1 : 0;
					var send_msg;
					if (msg.active) {
						send_msg = "/startreserv ";
						window.messagingService.reply(msg.id, send_msg + hash(send_msg + JSON.stringify(msg)));
					} else {
						if (confirm("Deseja apagar as reservas dessa messagem?")) {
							send_msg = "/cleanreserv ";
							delete db.messages[data.message_id];
							var timeout = (2000 + Math.round(Math.random() * 4000));
							for (var vid in db.reservations) {
								var isMine = db.reservations[vid].char.id === charId;
								if (db.reservations[vid].msg_id === data.message_id) {

									setTimeout(function (isMine, dettachVillage, myReservId, reservId, villageId) {
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

	var onNewMessage = function (event, data) {

		var params = data.message.content.trim().split(" ");
		var command = params[0].slice(1);
		var char_id = data.message.character_id;
		var char_name = data.message.character_name;
		var msg_id = data.message_id;
		var village_id, dt, sec_hash, reserv, msg, reservMsgBtn, reservActive;

		//log(params, command, char_id, char_name)
		switch (command) {
			case "addreserv":
				village_id = unzip(params[1]);
				dt = unzip(params[2]);
				sec_hash = params[3];
				if (db.reservations[village_id]) break;
				reserv = {
					dt: dt,
					char: {
						id: char_id,
						name: char_name
					},
					msg_id: msg_id
				};
				log("addreserv", data, village_id, dt, sec_hash, reserv);
				if (sec_hash === hash("/addreserv " + zip(village_id) + " " + zip(dt) + " " + JSON.stringify(reserv))) {
					db.reservations[village_id] = reserv;
					saveDB();
					window.gameAttachGroupToVillage(grpReserv.id, village_id);
				}
				break;

			case "remreserv":
				village_id = unzip(params[1]);
				sec_hash = params[2];
				if (!db.reservations[village_id]) break;
				reserv = db.reservations[village_id];
				log("remreserv", data, village_id, sec_hash, reserv, char_id);
				if (sec_hash === hash("/remreserv " + zip(village_id) + " " + JSON.stringify(reserv)) && reserv.char.id === char_id) {
					delete db.reservations[village_id];
					saveDB();
					window.gameDettachGroupToVillage(grpReserv.id, village_id);
				}
				break;

			case "startreserv":
				msg = {
					id: data.message_id,
					title: data.title,
					author_id: char_id,
					active: 1
				};
				sec_hash = params[1];
				log("startreserv", data, sec_hash, msg);
				if (sec_hash === hash("/startreserv " + JSON.stringify(msg))) {
					db.messages[data.message_id] = msg;
					saveDB();
					if ($(".reserv-msg-btn").length) {
						reservMsgBtn = $(".reserv-msg-btn");
						reservActive = reservMsgBtn.children(":first");
						reservActive.removeClass("icon-26x26-checkbox").addClass("icon-26x26-checkbox-checked");
					}
				}
				break;

			case "stopreserv":
				msg = db.messages[data.message_id];
				if (!msg) break;
				sec_hash = params[1];
				log("stopreserv", data, sec_hash, msg);
				if (sec_hash === hash("/stopreserv " + JSON.stringify(msg)) && msg.author_id === char_id) {
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
				msg = db.messages[data.message_id];
				if (!msg) break;
				sec_hash = params[1];
				log("cleanreserv", data, sec_hash, msg);
				if (sec_hash === hash("/cleanreserv " + JSON.stringify(msg)) && msg.author_id === char_id) {
					delete db.messages[data.message_id];
					var timeout = (2000 + Math.round(Math.random() * 4000));
					for (var vid in db.reservations) {
						var isMine = db.reservations[vid].char.id === charId;
						if (db.reservations[vid].msg_id === data.message_id) {
							setTimeout(function (isMine, dettachVillage, myReservId, reservId, villageId) {
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

	};

	// Groups
	var setGroups = function () {
		var grps = window.groupService.getGroups();
		getGroups(grps);
		if (!grpMyReserv || !grpReserv) {
			log("groups not found.");
			if (grps.length > 8) {
				log("no space for new groups. deleting the last ones.");
				if (confirm("A extensão de reservas precisa liberar espaço para 2 grupos. Deseja apagar os ultimos? (se preferir apagar manualmente, cancele agora, apague, e de refresh no jogo).")) {
					Object.keys(grps).slice(8).forEach(e => window.groupService.destroyGroup(e));
					return;
				}
			}
			log("creating groups...");
			window.groupService.createGroup(reservGroupIcons[0], "Minha Reserva");
			window.groupService.createGroup(reservGroupIcons[1], "Reservada");

			grps = window.groupService.getGroups();
			getGroups(grps);
		}
	}

	var getGroups = function (groups) {
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

	var onAttachGroupToVillage = function (groupId, villageId) {
		log("onAttachGroupToVillage", groupId, villageId);
		if (grpMyReserv.id != groupId) return true;
		var msg_id = parseInt($("#reservMsgs").val());
		if (!msg_id) {
			alert("Selecione uma mensagem antes de reservar!");
			return false;
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

	var onDettachGroupToVillage = function (groupId, villageId) {
		log("onDettachGroupToVillage", groupId, villageId);
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

	var onOpenGroupsIndexModal = function (villageId, villageName) {
		setGroups();
		log("onOpenGroupsIndexModal", villageId, villageName);
		checkIfLoaded(".groups-index .box-paper .col-third", function () {
			$(".groups-index .box-paper .col-third")
				.append('<br/><table class="tbl-border-light">'
					+ '<thead><tr><th class="ng-binding">Mensagem da reserva:</th></tr></thead>'
					+ '<tbody><tr class="ng-scope"><td><span class="ng-binding"><select id="reservMsgs" /></span></td></tr></tbody>'
					+ '</table>');
			$("#reservMsgs").css({ width: "278px" });
			$("#reservMsgs").append('<option value="0">Escolha uma mensagem p/ reserva</option>');
			log("fetching messages with reservations.");
			for (var m in db.messages) {
				var msg = db.messages[m];
				log(msg);
				if (msg.active) {
					$("#reservMsgs").append('<option value="' + msg.id + '">' + msg.title + '</option>');
				}
			}
			var reserv = db.reservations[villageId];
			if (reserv) {
				$("#reservMsgs").attr('disabled', 'disabled').val(reserv.msg_id);
			}
		});
	};

	var cleanDB = function () {
		for (var r in db.reservations) {
			var msg_id = db.reservations[r].msg_id;
			if (!db.messages[msg_id])
				delete db.reservations[r];
		}
		saveDB();
	}

	// Init
	var init = function () {
		checkIfLoaded('[ng-controller="BottomInterfaceController"]', function () {
			log("loading Reservations for TW2...");
			loadServices();
			loadDB();
			cleanDB();
			setNewHandlers();
			setGroups();
			log("Reservations for TW2 loaded.");
		});
	};

	return {
		Init: init,
		get DB() { return db; }
	};

})();

reservations.Init();

// reservations list example:
//[b][color=0111af][size=medium]RESERVAS:[/size] [br][br][/color][/b][b]B. Wolf[br][/b][village=17051]Império Leal - VII (488|393)[/village][br][b][br]pooh1[br][/b][village=19625]Camp 04 (484|400)[/village][br][b][br]FGOES[br][/b][village=30045]VI Marcelor (490|391)[/village][br][b][br]Rodrigo Barbaro 001[br][/b][village=17050]danispk68-3 (483|392)[/village] noblada [br][b][br]gerotto[br][/b][village=13756]danispk68-4 (483|396)[/village][br][village=13751]V Distrito de Marcelo I (482|401)[/village][br][village=13728]IV Capitania de Marcelo I (484|401)[/village][br][b][br]DullBoy[br][/b][village=29164]V  Provincia de Marcelo (484|394)[/village][br][b][br]K4m4l[/b][br][village=29587]XII GROTOVISK (479|393)[/village][br][b][br]felicosta[br][/b][village=13733]VII Marcelor (488|389)[/village][br][village=27668]IIIProvíncia de Marcelo I (486|398)[/village][br][b][br]Romops[br][/b][village=24569]Capitania de Marcelo I (466|383)[/village][br][village=33855]II Distrito Marcelo I (467|384)[/village][br][b][br]Ancient Felipe[br][/b][village=18098]Aldeia de Anderson felipelli (485|391)[/village][br][b][br]Joanna Dark[br][/b][village=15856]03. EraModern (486|396)[/village][br][village=32630]IV Distrito de Marcelo I (482|382)[/village][br][b][br]Jon Rakar[br][/b][village=30046]Aldeia Bárbara (484|391)[/village][br][b][br]geison neno[br][/b][village=30013]III Condado de Marcelo (475|393)[/village][br][br][b]vladgmania[/b][br][village=26608]II Província de Marcelo I (487|400)[/village][br][village=27649]IV Província de Marcelo I (487|398)[/village] 