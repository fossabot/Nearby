import { Command, Stopwatch, Type, util, KlasaClient, CommandOptions, CommandStore, KlasaMessage } from 'klasa';
import { inspect } from 'util';
import { MessageEmbed } from 'discord.js';
export default class extends Command {

    constructor(client: KlasaClient, store: CommandStore, file: string[], directory: string, options?: CommandOptions) {
        super(client, store, file, directory, {
            aliases: ["ev"],
            permissionLevel: 10,
            guarded: true,
            description: (language: { get: (arg0: string) => any; }) => language.get("COMMAND_EVAL_DESCRIPTION"),
            extendedHelp: language => language.get("COMMAND_EVAL_EXTENDEDHELP"),
            usage: "<Expresión:str>"
        });
    }

    async run(message: KlasaMessage, [code]: any[]) {
        const { success, result, time, type } = await this.eval(message, code);
        const tipo = util.codeBlock("ts", type);
        const salida = util.codeBlock("js", result);
        const errorOrSucces = message.language.get(success ? "COMMAND_EVAL_OUTPUT" : "COMMAND_EVAL_ERROR");
        if ("silent" in message.flagArgs) return null;
        const embed = new MessageEmbed()
            .setTitle(errorOrSucces)
            .setColor("#36393E")
            .setDescription(salida)
            .addField("Tipo", tipo)
            .addField("Tiempo", time);
        // menejador de mensajes largos
        if (salida.length > 2000) {
            if (message.guild && message.channel.attachable) {
                return message.channel.sendFile(
                    Buffer.from(result),
                    "output.txt",
                    message.language.get("COMMAND_EVAL_SENDFILE", time, tipo)
                );
            }
            this.client.emit("log", result);
            return message.sendLocale("COMMAND_EVAL_SENDCONSOLE", [time, tipo]);
        }

        // @ts-ignore
        return embed.send(message.channel);
    }

    // eval entrada
    async eval(message: KlasaMessage, code: string) {
        const { flagArgs: flags } = message;
        code = code.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        const stopwatch = new Stopwatch();
        let success, syncTime, asyncTime, result;
        let thenable = false;
        let type;
        try {
            if (flags.async) code = `(async () => {\n${code}\n})();`;
            result = eval(code);
            syncTime = stopwatch.toString();
            type = new Type(result);
            if (util.isThenable(result)) {
                thenable = true;
                stopwatch.restart();
                result = await result;
                asyncTime = stopwatch.toString();
            }
            success = true;
        } catch (error) {
            if (!syncTime) syncTime = stopwatch.toString();
            if (!type) type = new Type(error);
            if (thenable && !asyncTime) asyncTime = stopwatch.toString();
            if (error && error.stack) this.client.emit("error", error.stack);
            result = error;
            success = false;
        }

        stopwatch.stop();
        if (typeof result !== "string") {
            result = inspect(result, {
                depth: flags.depth ? parseInt(flags.depth) || 0 : 0,
                showHidden: Boolean(flags.showHidden)
            });
        }
        return {
            success,
            type,
            time: this.formatTime(syncTime, asyncTime),
            result: util.clean(result)
        };
    }

    formatTime(syncTime: string, asyncTime: string) {
        return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
    }

};
