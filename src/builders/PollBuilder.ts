export interface PollAnswerData {
  text: string;
  emoji?: { id?: string; name?: string };
}

export class PollBuilder {
  private question = "";
  private answers: PollAnswerData[] = [];
  private duration = 24;
  private allowMultiselect = false;

  public setQuestion(question: string): this {
    this.question = question;
    return this;
  }

  public addAnswer(answer: PollAnswerData): this {
    this.answers.push(answer);
    return this;
  }

  public setDuration(hours: number): this {
    this.duration = hours;
    return this;
  }

  public setAllowMultiselect(allow = true): this {
    this.allowMultiselect = allow;
    return this;
  }

  public toJSON(): object {
    return {
      question: { text: this.question },
      answers: this.answers.map((answer) => ({ poll_media: { text: answer.text, emoji: answer.emoji } })),
      duration: this.duration,
      allow_multiselect: this.allowMultiselect,
    };
  }
}
