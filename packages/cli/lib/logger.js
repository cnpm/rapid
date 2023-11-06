const cliProgress = require('cli-progress');
const boxen = require('boxen');

const MAX_TITLE_LENGTH = 11;

function padCenter(str, length, char = ' ') {
  const padLength = length - str.length;
  const padLeft = Math.floor(padLength / 2);
  const padRight = padLength - padLeft;
  return char.repeat(padLeft) + str + char.repeat(padRight);
}

class Bar {
  constructor({ type, total }) {
    const title = padCenter(type, MAX_TITLE_LENGTH);
    this.type = type;
    this.total = total;
    this.multiBar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: `[rapid] [{bar}] {percentage}% |${title}| {status} | {message}`,
      },
      cliProgress.Presets.shades_grey
    );

    this.startTime = Date.now();
    this.isTTY = process.stdout.isTTY;

    // init
    if (this.isTTY) {
      this.bar = this.multiBar.create(total, 1, {
        status: 'Running',
        warning: '',
        message: '',
      });
    }

  }

  update(current = '') {

    if (!this.isTTY) {
      return;
    }

    const { value, total } = this.bar;
    if (value < total) {
      this.isTTY && this.bar.update(value + 1, { status: 'Running', message: current });
    }

    if (value >= total - 1) {
      this.isTTY && this.bar.update(total - 1, { status: 'Processing', message: 'Processing...' });
    }
  }

  stop() {
    if (!this.isTTY) {
      console.log('[rapid] %s complete, %dms', this.type, Date.now() - this.startTime);
      return;
    }

    const { total } = this.bar;
    this.bar.update(total, {
      status: 'Complete',
      message: Date.now() - this.startTime + 'ms',
    });

    this.multiBar.stop();

  }
}

class Alert {
  static formatMessage(message) {
    if (Array.isArray(message)) {
      return message.map(_ => `* ${_}`).join('\n');
    }
    return message.trim();
  }

  static error(title = 'Error', message = 'OOPS, something error') {
    message = this.formatMessage(message);
    const boxedMessage = boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red',
      title,
      titleAlignment: 'center',
    });
    console.log(boxedMessage);
    process.exit(1);
  }

  static success(title = 'Success', message = [ 'Congratulations', 'The operation was successful' ]) {
    message = this.formatMessage(message);
    const boxedMessage = boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green',
      title,
      titleAlignment: 'center',
    });
    console.log(boxedMessage);
    process.exit(1);
  }
}

class Spin {
  constructor({ title = 'processing', showDots = false }) {
    const { createSpinner } = require('nanospinner');
    this.spinner = createSpinner(title).start();
    this.dots = 0;
    this.start = Date.now();

    if (showDots) {
      this.interval = setInterval(() => {
        this.dots = (this.dots + 1) % 4; // 循环点的数量从0到3
        const dotsString = '.'.repeat(this.dots); // 创建一个字符串，包含对应数量的点
        this.spinner.update({ text: `${title}${dotsString}` }); // 更新 spinner 文本
      }, 200); // 每200毫秒更新一次
    }
  }

  update(message) {
    this.spinner.update({ text: message });
  }

  success(message) {
    if (this.showDots) {
      clearInterval(this.interval);
    }
    this.spinner.success({ text: `${message || this.title}: ${Date.now() - this.start}ms` });
  }
}

exports.Spin = Spin;

exports.Bar = Bar;
exports.Alert = Alert;
