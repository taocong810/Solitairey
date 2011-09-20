(function () {
	var active = {
		name: "klondike",
		game: null
	    },
	    yui = YUI(), Y,
	    games = {
		"agnes": "Agnes",
		"klondike": "Klondike",
		"klondike1t": "Klondike1T",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"golf": "Golf",
		"grandfathers-clock": "GClock",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"russian-solitaire": "RussianSolitaire",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
                "spiderette": "Spiderette",
		"tri-towers": "TriTowers",
		"will-o-the-wisp": "WillOTheWisp",
		"yukon": "Yukon"},

	    extensions = [
		"auto-turnover",
	        "statistics",
		"solver-freecell",
		"solitaire-autoplay",
	        "solitaire-ios",
		"solitaire-background-fix"],

	Fade = (function() {
		var el = null,
		    body,
		    css = {
		    position: "absolute",
		    display: "none",
		    backgroundColor: "#000",
		    opacity: 0.7,
		    top: 0,
		    left: 0,
		    width: 0,
		    height: 0,
		    zIndex: 1000,
		},

		element = function() {
			if (el === null) {
				el = Y.Node.create("<div>");
				el.setStyles(css);
				body = Y.one("body").append(el);
			}
			return el;
		};

		return {
			show: function() {
				var el = element();

				css.display = "block";
				css.width = el.get("winWidth");
				css.height = el.get("winHeight");

				el.setStyles(css);

				body.addClass("scrollable");
			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);

				body.removeClass("scrollable");
			}
		};
	}()),

	GameChooser = {
		selected: null,
		fade: false,

		init: function () {
			this.refit();
		},

		refit: function () {
			var node = Y.one("#game-chooser"),
			    width = node.get("winWidth"),
			    height = node.get("winHeight");

			node.setStyle("min-height", height);
		},

		show: function (fade) {
			if (!this.selected) {
				this.select(active.name);
			}

			if (fade) {
				Fade.show();
				this.fade = true;
			}

			Y.one("#game-chooser").addClass("show");
		},

		hide: function () {
			if (this.fade) {
				Fade.hide();
			}

			Y.one("#game-chooser").removeClass("show");
			Y.fire("gamechooser:hide", this);
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div"),
			    previous = this.selected;
			
			if (previous !== game) {
				this.unSelect();
			}

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
			}

			if (previous && previous !== game) {
				Y.fire("gamechooser:select", this);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			this.selected = null;
		}
	};

	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.unshift(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		exportAPI();
		Y.on("domready", load);
	}

	function showDescription() {
		GameChooser.select(this._node.id);
		GameChooser.choose();
	}

	function attachEvents() {
		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", function () { GameChooser.show(true); }, Y.one("#choose_game"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new_deal"));
		Y.on("click", function () { GameChooser.hide(); }, Y.one("#game-chooser .close"));

		Y.delegate("click", showDescription, "#descriptions", "li");

		Y.one("document").on("keydown", function (e) {
			e.keyCode === 27 && GameChooser.hide();
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250,
		    attachEvent;

		if (window.addEventListener) {
			attachEvent = "addEventListener";
		} else if (window.attachEvent) {
			attachEvent = "attachEvent";
		}

		window[attachEvent](Y.Solitaire.Application.resizeEvent, function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, false);
	}

	function resize() {
		active.game.resize(sizeRatio());
		GameChooser.refit();
	}

	function sizeRatio() {
		var game = active.game,
		    el = game.container(),
		    width = el.get("winWidth"),
		    height = el.get("winHeight");

		return Math.min(width / game.width(), height / game.height(), 1);
	}

	function playGame(name) {
		var twoWeeks = 1206900000;

		active.name = name;
		active.game = Y.Solitaire[games[name]];
		Y.Cookie.set("options", name, {expires: new Date(new Date().getTime() + twoWeeks)});
		newGame();
	}

	function loadOptions() {
		var options = Y.Cookie.get("options");

		options && (active.name = options);
	}

	function load() {
		var save = Y.Cookie.get("saved-game");

		attachEvents();
		loadOptions();

		if (save) {
			active.game = Y.Solitaire[games[active.name]];
			clearDOM();
			active.game.loadGame(save);
		} else {
			playGame(active.name);
		}

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
		active.game.scale(sizeRatio());
	}

	function restart() {
		var init = Y.Cookie.get("initial-game"),
		    game = active.game;

		if (init) {
			clearDOM();
			game.cleanup();
			game.loadGame(init);
			game.save();
		}
	}

	function newGame() {
		var game = active.game;

		clearDOM();
		game.cleanup();
		game.newGame();
	}

	function exportAPI() {
		Y.Solitaire.Application = {
			resizeEvent: "resize",
			GameChooser: GameChooser,
			newGame: newGame
		};
	}

	yui.use.apply(yui, modules().concat(main));
}());
