const cliProgress = require('cli-progress');
const boxen = require('boxen');

const MAX_TITLE_LENGTH = 11;

function padCenter(str, length, char = ' ') {
  const padLength = length - str.length;
  const padLeft = Math.floor(padLength / 2);
  const padRight = padLength - padLeft;
  return char.repeat(padLeft) + str + char.repeat(padRight);
}

const isTTY = process.stdout.isTTY;

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

    // init
    if (isTTY) {
      this.bar = this.multiBar.create(total, 1, {
        status: 'Running',
        warning: '',
        message: '',
      });
    }

  }

  update(current = '') {

    if (!isTTY) {
      return;
    }

    const { value, total } = this.bar;
    if (value < total) {
      isTTY && this.bar.update(value + 1, { status: 'Running', message: current });
    }

    if (value >= total - 1) {
      isTTY && this.bar.update(total - 1, { status: 'Processing', message: 'Processing...' });
    }
  }

  stop() {
    if (!isTTY) {
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
    if (!isTTY) {
      console.log(message);
      process.exit(1);
    }
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
    if (!isTTY) {
      console.log(message);
      return;
    }
    const boxedMessage = boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green',
      title,
      titleAlignment: 'center',
    });
    console.log(boxedMessage);
  }
}

class Spin {
  constructor({ title = 'processing', showDots = false }) {
    const { createSpinner } = require('nanospinner');

    if (!isTTY) {
      console.log(`[rapid] ${title}`);
      return;
    }

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
    if (!isTTY) {
      console.log(`[rapid] ${message}`);
      return;
    }
    this.spinner.update({ text: message });
  }

  success(message) {
    const text = `${message || this.title}: ${Date.now() - this.start}ms`;
    if (!isTTY) {
      console.log(`[rapid] ${text}`);
      return;
    }
    if (this.showDots) {
      clearInterval(this.interval);
    }
    this.spinner.success({ text });
  }
}

exports.Spin = Spin;
exports.Bar = Bar;
exports.Alert = Alert;
