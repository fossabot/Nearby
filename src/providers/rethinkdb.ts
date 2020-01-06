import { Provider, util, KlasaClient, ProviderStore, ProviderOptions } from 'klasa';
import { r } from 'rethinkdb-ts';

export default class extends Provider {
    private db: any
    private pool: any

	constructor(client: KlasaClient, store: ProviderStore, file: string[], directory: string, options?: ProviderOptions) {
		super(client, store, file, directory);

		this.db = r;
		this.pool = null;
	}

	async init(): Promise<void> {
		const options = util.mergeDefault({
			db: 'test',
			silent: false
		}, this.client.options.providers.rethinkdb);

		this.pool = await r.connectPool(options);
		await this.db.branch(this.db.dbList().contains(options.db), null, this.db.dbCreate(options.db)).run();
	}

	async ping(): Promise<number> {
		const now = Date.now();
		return (await this.db.now().run()).getTime() - now;
	}

	shutdown(): Promise<void> {
		return this.pool.drain();
	}

	hasTable(table: string): Promise<boolean> {
		return this.db.tableList().contains(table).run();
	}

	createTable(table: string): Promise<object> {
		return this.db.tableCreate(table).run();
	}

	deleteTable(table: string): Promise<object> {
		return this.db.tableDrop(table).run();
	}

	sync(table: string): Promise<object> {
		return this.db.table(table).sync().run();
	}
	async getAll(table: string, entries: any[] = []): Promise<any[]> {
		if (entries.length) {
			const chunks = util.chunk(entries, 50000);
			const output = [];
			for (const myChunk of chunks) output.push(...await this.db.table(table).getAll(...myChunk).run());
			return output;
		}
		return this.db.table(table).run();
	}

	async getKeys(table: string, entries: any[] = []): Promise<string[]> {
		if (entries.length) {
			const chunks = util.chunk(entries, 50000);
			const output = [];
			for (const myChunk of chunks) output.push(...await this.db.table(table).getAll(...myChunk)('id').run());
			return output;
		}
		return this.db.table(table)('id').run();
	}

	get(table: string, id: string): Promise<object> {
		return this.db.table(table).get(id).run();
	}

	has(table: string, id: string): Promise<boolean> {
		return this.db.table(table).get(id).ne(null).run();
	}

	getRandom(table: string): Promise<any> {
		return this.db.table(table).sample(1).run();
	}

	create(table: string, id: string, value: object = {}): Promise<object> {
		return this.db.table(table).insert({ ...this.parseUpdateInput(value), id }).run();
	}

	update(table: string, id: string, value: any): Promise<object> {
		return this.db.table(table).get(id).update(this.parseUpdateInput(value)).run();
	}

	replace(table: string, id: string, value: any): Promise<object> {
		return this.db.table(table).get(id).replace({ ...this.parseUpdateInput(value), id }).run();
	}

	delete(table: string , id: string): Promise<object> {
		return this.db.table(table).get(id).delete().run();
	}

};