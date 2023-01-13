module.exports = {
	async getlogs({ homey }) {
		const result = await homey.app.getlogs();
		return result;
	},
	async deletelogs({ homey }) {
		const result = await homey.app.deletelogs();
		return result;
	}
};