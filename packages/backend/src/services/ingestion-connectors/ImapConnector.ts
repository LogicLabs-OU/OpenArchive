import type { GenericImapCredentials, EmailObject, EmailAddress } from '@open-archiver/types';
import type { IEmailConnector } from '../EmailProviderFactory';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail, Attachment, AddressObject } from 'mailparser';

export class ImapConnector implements IEmailConnector {
    private client: ImapFlow;

    constructor(private credentials: GenericImapCredentials) {
        this.client = new ImapFlow({
            host: this.credentials.host,
            port: this.credentials.port,
            secure: this.credentials.secure,
            auth: {
                user: this.credentials.username,
                pass: this.credentials.password,
            },
            logger: false, // Set to true for verbose logging
        });
    }

    public async testConnection(): Promise<boolean> {
        try {
            await this.client.connect();
            await this.client.logout();
            return true;
        } catch (error) {
            console.error('Failed to verify IMAP connection:', error);
            return false;
        }
    }

    public async *fetchEmails(userEmail?: string, since?: Date): AsyncGenerator<EmailObject> {
        await this.client.connect();
        try {
            await this.client.mailboxOpen('INBOX');

            const searchCriteria = since ? { since } : { all: true };

            for await (const msg of this.client.fetch(searchCriteria, { envelope: true, source: true, bodyStructure: true })) {
                if (msg.envelope && msg.source) {
                    const parsedEmail: ParsedMail = await simpleParser(msg.source);
                    const attachments = parsedEmail.attachments.map((attachment: Attachment) => ({
                        filename: attachment.filename || 'untitled',
                        contentType: attachment.contentType,
                        size: attachment.size,
                        content: attachment.content as Buffer
                    }));

                    const mapAddresses = (addresses: AddressObject | AddressObject[] | undefined): EmailAddress[] => {
                        if (!addresses) return [];
                        const addressArray = Array.isArray(addresses) ? addresses : [addresses];
                        return addressArray.flatMap(a => a.value.map(v => ({ name: v.name, address: v.address || '' })));
                    };

                    yield {
                        id: msg.uid.toString(),
                        from: mapAddresses(parsedEmail.from),
                        to: mapAddresses(parsedEmail.to),
                        cc: mapAddresses(parsedEmail.cc),
                        bcc: mapAddresses(parsedEmail.bcc),
                        subject: parsedEmail.subject || '',
                        body: parsedEmail.text || '',
                        html: parsedEmail.html || '',
                        headers: parsedEmail.headers as any,
                        attachments,
                        receivedAt: parsedEmail.date || new Date(),
                        eml: msg.source
                    };
                }
            }
        } finally {
            await this.client.logout();
        }
    }
}
