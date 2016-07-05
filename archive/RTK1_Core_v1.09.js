//=============================================================================
// RTK1_Core.js  ver1.09 2016/07/01
//=============================================================================

/*:
 * @plugindesc Core functions of RTK1 library for RPG Maker MV.
 * @author Toshio Yamashita (yamachan)
 *
 * @param language
 * @desc Set your RPG Maker MV's language.
 * (0:Auto detect 1:English 2:Japanese)
 * @default 0
 *
 * @param debug
 * @desc Debug mode (0:OFF 1:ON)
 * @default 0
 *
 * @param json
 * @desc Also save uncompressed JSON file (0:OFF 1:ON)
 * @default 0
 *
 * @help This plugin does not provide plugin commands.
 * 
 * https://github.com/yamachan/jgss-hack/blob/master/RTK1_Core.md
 */

/*:ja
 * @plugindesc RPG ツクール MV 用に作成された RTK1 ライブラリの基本機能です
 * @author Toshio Yamashita (yamachan)
 *
 * @param language
 * @desc RPG ツクール自体の言語設定は？
 * (0:自動設定 1:英語 2:日本語)
 * @default 0
 *
 * @param debug
 * @desc デバッグ用モード (0:OFF 1:ON)
 * @default 0
 *
 * @param json
 * @desc 非圧縮jsonデータも保存する (0:OFF 1:ON)
 * @default 0
 *
 * @help このプラグインにはプラグインコマンドはありません。
 *
 * https://github.com/yamachan/jgss-hack/blob/master/RTK1_Core.ja.md
 */

//-----------------------------------------------------------------------------

/**
 * The static class that defines core functions.
 *
 * @class RTK
 */
function RTK() {
    throw new Error('This is a static class');
}

/**
 * The revision number of the RTK1 library.
 *
 * @static
 * @property VERSION_NO
 * @type Number
 * @final
 */
RTK.VERSION_NO = 1.09;

// ----- for Services -----

RTK._inits = [];
RTK.onReady = function(_func){
	if ("function" == typeof _func) {
		RTK._inits.push(_func);
	}
};

RTK._ready = false;
RTK._modules = {};

RTK._calls = {};
RTK.onCall = function(_command, _func){
	if (typeof _command == "string" && _command.length > 0 && typeof _func == "function") {
		RTK._calls[_command] = _func;
	}
};

RTK._starts = [];
RTK.onStart = function(_func){ if ("function" == typeof _func) RTK._starts.push(_func); };
RTK._save = [];
RTK.onSave = function(_func){ if ("function" == typeof _func) RTK._save.push(_func); };
RTK._load = [];
RTK.onLoad = function(_func){ if ("function" == typeof _func) RTK._load.push(_func); };

// ----- for Debug -----

RTK.log = function(_v, _o) {
	if (this._debug && console && _v) {
		if (typeof _v == "string" || typeof _v == "number") {
			console.log(_v);
		} else {
			console.dir(_v);
		}
		if (_o) {
			console.dir(_o);
		}
	}
};

RTK.trace = function(_v) {
	RTK.log(_v);
	if (this._debug && Error.captureStackTrace) {
		var o = {};
		Error.captureStackTrace(o, RTK.trace);
		console.dir(o.stack);
	}
};

// ----- Basic JS Functions -----

RTK.cloneObject = function(_o) {
	if (null == _o || typeof _o != "object") {
		return null;
	}
	var o = _o.constructor();
	for (var k in _o) {
		if (_o.hasOwnProperty(k)) o[k] = _o[k];
	}
	return o;
};
RTK.ucfirst = function(_s, _footer) {
	if ("string" == typeof _s) {
		return _s.charAt(0).toUpperCase() + _s.slice(1) + (_footer && _s != "" ? _footer : "");
	}
	return "";
}
RTK.isTrue = function(_v) { return !!_v; };
RTK.isFalse = function(_v) { return !_v; };

// ----- Basic Game Functions -----

RTK.objectType = function(_o) {
	return DataManager.isItem(_o) ? "i" : DataManager.isWeapon(_o) ? "w" : DataManager.isArmor(_o) ? "a" : DataManager.isSkill(_o) ? "s" : "";
}
RTK.object2id = function(_o) {
	var t = RTK.objectType(_o);
	return t ? t + _o.id : "";
};
RTK.id2object = function(_id) {
	if ("string" == typeof _id) {
		var a = _id.match(/^\s*([aisw])(\d+)\s*$/i);
		if (a) {
			return (a[1] == "i" ? $dataItems : a[1] == "w" ? $dataWeapons : a[1] == "a" ? $dataArmors : $dataSkills)[a[2]];
		}
	}
	return undefined;
};
RTK.objects2ids = function(_a) {
	return _a instanceof Array ? _a.map(RTK.object2id).filter(RTK.isTrue) : null;
};
RTK.ids2objects = function(_a) {
	if (_a instanceof Array) {
		return _a.map(RTK.id2object).filter(RTK.isTrue);
	}
	return null;
};
RTK.hasId = function(_id, _n) {
	_n = _n||1;
	if ("string" == typeof _id) {
		var a = _id.match(/^\s*([aiw])(\d+)\s*$/i);
		if (a) {
			var list = a[1] == "i" ? $gameParty._items : a[1] == "w" ? $gameParty._weapons : $gameParty._armors;
			var n = list[Number(a[2])];
			return n >= _n ? n : 0;
		}
	}
	return 0;
};

// ----- Init -----

(function(_global) {
	var N = 'RTK1_Core';

	var param = PluginManager.parameters(N);
	RTK._lang = Number(param['language'] || 0);
	RTK._debug = Number(param['debug'] || 0);
	RTK._json = Number(param['json'] || 0);

	function RTK_init(){
		if ($dataItems && $dataSystem && $dataSystem.terms && $dataSystem.terms.basic && $dataSystem.terms.commands && $dataSystem.terms.messages && $dataMapInfos) {
			if (RTK._lang == 0) {
				if (!$dataSystem.terms.basic[0].match(/^[\s!-~]+$/) || !$dataSystem.terms.commands[0].match(/^[\s!-~]+$/)) {
					RTK._lang = 1;
				}
			} else {
				RTK._lang--;
			}
			for (var l=0; l<RTK._inits.length; l++) {
				if ("function" == typeof RTK._inits[l]) {
					RTK._inits[l]();
				}
			}
			RTK._ready = true;
			RTK.log(N + " ready (_lang:" + RTK._lang + ", _debug:" + RTK._debug + ", _json:" + RTK._json + ")");
		} else {
			setTimeout(RTK_init, 100);
		}
	};
	var _Scene_Boot_checkPlayerLocation = Scene_Boot.prototype.checkPlayerLocation;
	Scene_Boot.prototype.checkPlayerLocation = function() {
		_Scene_Boot_checkPlayerLocation.call(this);
		RTK_init();
	};

	var _Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
	Scene_Title.prototype.commandNewGame = function() {
		_Scene_Title_commandNewGame.call(this);
		for (var l=0; l<RTK._starts.length; l++) {
			if ("function" == typeof RTK._starts[l]) {
				RTK._starts[l](true);
			}
		}
		RTK.log(N + " start [new game] (_lang:" + RTK._lang + ", _ready:" + RTK._ready + ")");
	};
	var _Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
	Scene_Load.prototype.onLoadSuccess = function() {
		_Scene_Load_onLoadSuccess.call(this);
		for (var l=0; l<RTK._starts.length; l++) {
			if ("function" == typeof RTK._starts[l]) {
				RTK._starts[l](false);
			}
		}
		RTK.log(N + " start [load game] (_lang:" + RTK._lang + ", _ready:" + RTK._ready + ")");
	};

	// ----- json option -----

	RTK.writeFileSync = function(_f, _d, _fo){
		var fs = require('fs');
		var dirPath = StorageManager.localFileDirectoryPath();
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		fs.writeFileSync((_fo ? dirPath : "") + _f, _d);
		RTK.log(N + ".writeFileSync: " + (_fo ? dirPath : "") + _f);
	};
	if (RTK._json) {
		var _StorageManager_saveToLocalFile = StorageManager.saveToLocalFile;
		StorageManager.saveToLocalFile = function(savefileId, json) {
			_StorageManager_saveToLocalFile.call(this, savefileId, json);
			var filePath = this.localFilePath(savefileId);
			RTK.writeFileSync(filePath + ".json", json)
		};
	}

	// ----- Plugin command -----

	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.call(this, command, args);
		if (RTK._calls[command]) {
			RTK._calls[command].call(this, args, command);
		}
	};

	// ----- Persistent data -----

	RTK._data = RTK._data || {};
	RTK.save = function(_k, _v) {
		if ("string" == typeof _k && _k != "" && _v !== undefined) {
			RTK._data[_k] = _v;
		}
	};
	RTK.load = function(_k) {
		return RTK._data[_k];
	};
	RTK.del = function(_k) {
		if (RTK._data[_k] !== undefined) {
			delete RTK._data[_k];
		}
	};
	RTK.pack = function(_s, _e) {
		if (_s < _e && _s > 0 && _e > 0 && _s <= $gameVariables._data.length && _e <= $gameVariables._data.length) {
			var ret = [];
			for (var l=_s; l<=_e; l++) {
				ret.push($gameVariables._data[l]);
			}
			return ret;
		}
		return undefined;
	};
	RTK.unpack = function(_s, _a) {
		if (_s > 0 && _a instanceof Array&& _s + _a.length <= $gameVariables._data.length) {
			for (var l=0; l<_a.length; l++) {
				$gameVariables._data[_s + l] = _a[l];
			}
		}
	}

	var _DataManager_makeSaveContents = DataManager.makeSaveContents;
	DataManager.makeSaveContents = function() {
		var contents = _DataManager_makeSaveContents.call(this);
		contents.RTK1_Core = RTK._data;
		for (var l=0; l<RTK._save.length; l++) {
			if ("function" == typeof RTK._save[l]) {
				RTK._save[l](contents);
			}
		}
		RTK.log(N + " makeSaveContents: RTK._data", RTK._data);
		return contents;
	};

	var _DataManager_extractSaveContents = DataManager.extractSaveContents;
	DataManager.extractSaveContents = function(contents) {
		_DataManager_extractSaveContents.call(this, contents);
		if (contents && contents.RTK1_Core) {
			RTK._data = contents.RTK1_Core;
		}
		for (var l=0; l<RTK._load.length; l++) {
			if ("function" == typeof RTK._load[l]) {
				RTK._load[l](contents);
			}
		}
		RTK.log(N + "extractSaveContents: RTK._data", RTK._data);
	};

	// ----- Simple text control -----

	RTK._text = RTK._text || {};
	RTK.jp = function(){
		return RTK.EJ ? RTK.EJ._langSelect : RTK._lang == 1;
	};
	RTK.text = function(_e, _j){
		if ("string" == typeof _e && _e != "") {
			var key = _e.toLowerCase();
			if (_j !== undefined) {
				RTK._text[key] = _j;
			}
			return RTK.jp() ? (RTK._text[key]||_e) : _e;
		}
		return undefined;
	};

	// ----- Experimental (not official) -----

	RTK.getFileText = function(src){
		var req = new XMLHttpRequest();
		req.open("GET", src, false);
		req.send(null);
		return req.responseText;
	};

	RTK.pluginAuthors = function(plugins) {
		plugins = plugins ? plugins : $plugins;
		plugins.forEach(function(plugin) {
			if (!plugin.author) {
				var txt = RTK.getFileText(PluginManager._path + plugin.name + '.js');
				var ret = txt.match(/@author ([^\f\n\r]+)/);
				if (ret && ret[1] != "") {
					plugin.author = ret[1];
				}
			}
		});
	};

	RTK.command = function(_v) {
		if ("string" == typeof _v && _v != "" && $gameMap && $gameMap._interpreter) {
			var args = _v.split(" ");
			var command = args.shift();
			$gameMap._interpreter.pluginCommand(command, args);
		}
	};

})(this);
