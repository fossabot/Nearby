import { KlasaClient, KlasaClientOptions } from 'klasa';
import { config, token } from '../config';
import * as dotenv from 'dotenv'
dotenv.config()


class Nearby extends KlasaClient {

	constructor(options: KlasaClientOptions) {
		super(options);
	}

}

new Nearby(config).login(token);
