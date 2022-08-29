const { MongoClient, ObjectID } = require('mongodb');
const { url } = require('../../mongodb-credentials.js')
const SshClient = require('ssh2-sftp-client');
const debug = require('debug')('app:scriptController');
const PropertiesReader = require('properties-reader');
const appProperties = PropertiesReader('./app.properties');

let defaultModules = [];
let chosenModulesMap = new Map(); // Map preserves order in which items were inserted
let chosenModulesObj = {};
let serverCredentials = {};
let remoteFolder;
let client;

async function getDefaultDbCollection() {
	try {
		const dbName = 'scriptocrat';

		client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
		debug('Connected correctly to server');

		const db = await client.db(dbName);
		const col = await db.collection('defaultModules');

		return col;
	} catch (err) {
		debug(err.stack);
	}

	return 1;
}

async function cleanup() {
	serverCredentials = {};
	remoteFolder = '';
	chosenModulesMap.clear;

	for (let chosenModuleKey of chosenModulesMap.keys()) {
		chosenModulesMap.delete(chosenModuleKey);
	};


	chosenModulesObj = {};
}

module.exports = function scriptController() {
	async function getDefaultModules(req, res, next) {
		debug('getDefaultModules');

		try {
			const defaultCollection = await getDefaultDbCollection(client);
			debug(`defCol: ${defaultCollection}`);

			defaultModules = await defaultCollection.find().toArray();

		} catch (err) {
			debug(err.stack);
		}

		client.close();

		next();
	}

	async function setServerAddress (req, res, next) {
		debug('setServerAddress');

		try {
			if (Object.entries(serverCredentials).length === 0 && 
						(req.body.host !== undefined || 
						req.body.port !== undefined || 
						req.body.user !== undefined || 
						req.body.password !== undefined || 
						req.body.folder !== undefined)) {
				serverCredentials.host = req.body.host;
				serverCredentials.port = req.body.port;
				serverCredentials.user = req.body.user;
				serverCredentials.password = req.body.password;
				remoteFolder = req.body.folder;
			}
			debug(`serverCredentials: ${serverCredentials.host}`);
		} catch (err) {
			debug(err.stack);
		}

		next();
	}

	async function getTextareaContent (req, res, next) {
		debug('getTextareaContent');

		// textarea persistence - copies textarea content to chosenModulesMap
		try {
			if (chosenModulesMap.size === 1) {
				for (let chosenModuleKey of chosenModulesMap.keys()) {
					chosenModulesMap.get(chosenModuleKey).moduleCode = await req.body.oneModule;
					debug(`moduleCode[0]: ${chosenModulesMap.get(chosenModuleKey).moduleCode}`);
				};
			} else if (chosenModulesMap.size > 1) {
				let i = 0;
				for (let chosenModuleKey of chosenModulesMap.keys()) {
					chosenModulesMap.get(chosenModuleKey).moduleCode = await req.body.oneModule[i];
					debug(`moduleCode[${i}]: ${chosenModulesMap.get(chosenModuleKey).moduleCode}`);
					i++
				};
			};
		} catch (err) {
			debug(err.stack);
		}

		next();
	}

	async function renderPage(req, res, next) {
		try {
			await res.render(
				'scripts-page',
				{
					defaultModules,
					chosenModulesObj,
				},
			);
		} catch (err) {
			debug(err.stack);
		}

		next();
	}

	async function getChosenModule(req, res, next) {
		if (req.body.moduleID) {
			debug('getChosenModule');
			
			try {
				const moduleId = await req.body.moduleID;
				const defaultCollection = await getDefaultDbCollection(client);

				const chosenModule = await defaultCollection.findOne({ _id: new ObjectID(moduleId) });
				await chosenModulesMap.set(moduleId, chosenModule);
				
				// pug doesn't accept Map() so converting to Object
				chosenModulesObj = await Object.fromEntries(chosenModulesMap);
			} catch (err) {
				debug(err.stack);
			}

			client.close();

			debug(`moduleID: ${req.body.moduleID}`);
		}

		next();
	}


	async function createScript(req, res, next) {
		if (req.body.scriptCreateButton === 'createScript') {
			debug('createScript');
			debug(`req.body.oneModule: ${req.body.oneModule}`);

			try {
				debug(`serverCredentials: ${serverCredentials.host}`);
				
				let scriptString = '';

				for (let chosenModuleKey of chosenModulesMap.keys()) {
					scriptString += `${chosenModulesMap.get(chosenModuleKey).moduleCode}\n`;
				};

				debug(`scriptString: ${scriptString}`);

				const scriptBuffer = await Buffer.from(scriptString, 'utf-8');
				const remoteFile = `${remoteFolder}scriptocrat.txt`;

				if (Object.entries(serverCredentials).length !== 0) {
					const sftp = new SshClient();
					await sftp.connect(serverCredentials);
					await sftp.put(scriptBuffer, remoteFile);
					await sftp.end();

					cleanup();

					res.redirect(200, appProperties.get('awslink'));
				} else {
					cleanup();

					res.redirect(400, appProperties.get('awslink'));
				}
			} catch (err) {
				debug(err.stack);
			}
		}
			
		next();
	}
		
	return {
		getDefaultModules,
		setServerAddress,
		getTextareaContent,
		renderPage,
		getChosenModule,
		createScript,
	};
};
