const express = require('express');
const scriptController = require('../controllers/scriptController');

const scriptRouter = express.Router();

module.exports = function router() {
	const {
		getDefaultModules,
		setServerAddress,
		getTextareaContent,
		renderPage,
		getChosenModule,
		createScript,
	} = scriptController();

	scriptRouter.route('/')
		.get(getDefaultModules, getTextareaContent, renderPage)
		.post(setServerAddress, getTextareaContent, getChosenModule, createScript, renderPage);

	return scriptRouter;
};
