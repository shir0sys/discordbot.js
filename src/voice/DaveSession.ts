import { EventEmitter } from "node:events";
import { DAVESession, MediaType, type ProposalsResult } from "@snazzah/davey";

type DaveSessionEvents = {
  sendKeyPackage: [Buffer];
  sendCommitWelcome: [Buffer, Buffer | undefined];
  sendReady: [number];
  sendInvalidCommitWelcome: [number];
  ready: [];
  debug: [string];
};

/**
 * Drives the DAVE (end-to-end encryption) MLS group handshake described at
 * https://daveprotocol.com/ on top of @snazzah/davey's DAVESession, which
 * owns the actual MLS/cryptographic state — this class only sequences the
 * voice gateway's opcode exchange around it (when to send a key package,
 * when a processed proposal yields a commit to send, when to ack a
 * transition) and never touches MLS wire bytes itself.
 */
export class DaveSession extends EventEmitter {
  private session: DAVESession;

  constructor(
    private protocolVersion: number,
    private readonly userId: string,
    private readonly channelId: string,
  ) {
    super();
    this.session = new DAVESession(protocolVersion, userId, channelId);
  }

  public get ready(): boolean {
    return this.session.ready;
  }

  /** Submits our key package — per the DAVE handshake, this happens as soon as a non-zero dave_protocol_version is known, independent of when the external sender arrives. */
  public start(): void {
    this.emit("sendKeyPackage", this.session.getSerializedKeyPackage());
  }

  public handleExternalSender(data: Buffer): void {
    this.session.setExternalSender(data);
  }

  public handleProposals(operationType: number, data: Buffer): void {
    let result: ProposalsResult;
    try {
      // Not passing recognizedUserIds here: it's meant to reject proposals
      // for users the client hasn't seen join/leave, but clients_connect
      // only fires for members who connect *after* us — members already in
      // the channel when we join are never announced that way, so this
      // check reliably (and wrongly) rejects proposals that add them,
      // observed live as processProposals throwing UnexpectedUser(...) for
      // an already-present member. Trusting the voice gateway's own
      // proposals is reasonable here; it's the one source for this group.
      result = this.session.processProposals(operationType, data);
    } catch (error) {
      this.emit("debug", `processProposals failed: ${(error as Error).message}`);
      return;
    }
    if (result.commit) this.emit("sendCommitWelcome", result.commit, result.welcome);
  }

  public handleAnnounceCommitTransition(transitionId: number, commit: Buffer): void {
    try {
      this.session.processCommit(commit);
    } catch (error) {
      this.emit("debug", `processCommit failed: ${(error as Error).message}`);
      this.emit("sendInvalidCommitWelcome", transitionId);
      this.reinitSession();
      this.start();
      return;
    }
    this.emit("sendReady", transitionId);
    if (this.session.ready) this.emit("ready");
  }

  public handleWelcome(transitionId: number, welcome: Buffer): void {
    try {
      this.session.processWelcome(welcome);
    } catch (error) {
      this.emit("debug", `processWelcome failed: ${(error as Error).message}`);
      this.emit("sendInvalidCommitWelcome", transitionId);
      this.reinitSession();
      this.start();
      return;
    }
    this.emit("sendReady", transitionId);
    if (this.session.ready) this.emit("ready");
  }

  /** The server moved the call to a new DAVE protocol version — start the group handshake over. */
  public handlePrepareEpoch(protocolVersion: number): void {
    this.protocolVersion = protocolVersion;
    this.reinitSession();
    this.start();
  }

  private reinitSession(): void {
    this.session.reinit(this.protocolVersion, this.userId, this.channelId);
  }

  /** Enables/disables unencrypted passthrough — used when the server downgrades the call out of E2EE. */
  public setPassthroughMode(enabled: boolean): void {
    this.session.setPassthroughMode(enabled);
  }

  public encryptOpus(frame: Buffer): Buffer {
    return this.session.encryptOpus(frame);
  }

  /** Reverses encryptOpus() for a specific sender — DAVE derives independent per-sender keys, so the user id isn't optional. */
  public decryptOpus(userId: string, packet: Buffer): Buffer {
    return this.session.decrypt(userId, MediaType.AUDIO, packet);
  }
}

export interface DaveSession {
  on<K extends keyof DaveSessionEvents>(event: K, listener: (...args: DaveSessionEvents[K]) => void): this;
  emit<K extends keyof DaveSessionEvents>(event: K, ...args: DaveSessionEvents[K]): boolean;
}
