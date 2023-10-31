const cliProgress = require('cli-progress');

const MAX_TITLE_LENGTH = 11;

function padCenter(str, length, char = ' ') {
  const padLength = length - str.length;
  const padLeft = Math.floor(padLength / 2);
  const padRight = padLength - padLeft;
  return char.repeat(padLeft) + str + char.repeat(padRight);
}

class Bar {
  constructor({ type, total, autoFinish = true }) {
    const title = padCenter(type, MAX_TITLE_LENGTH);
    this.multiBar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: `[rapid] [{bar}] {percentage}% |${title}| {status} | {message}`,
      },
      cliProgress.Presets.shades_grey
    );

    this.startTime = Date.now();
    this.autoFinish = autoFinish;

    // init
    this.bar = this.multiBar.create(total, 0, {
      status: 'Waiting',
      warning: '',
      message: '',
    });

  }

  update(current = '') {

    const { value, total } = this.bar;
    if (value < total) {
      this.bar.update(value + 1, { status: 'Running', message: current });
    }

    if (value >= total - 1) {
      if (this.autoFinish) {
        this.stop();
      } else {
        this.bar.update(total - 1, { status: 'Processing', message: 'Processing...' });
      }
    }
  }

  stop() {
    const { total } = this.bar;
    this.bar.update(total, {
      status: 'Complete',
      message: Date.now() - this.startTime + 'ms',
    });
    this.multiBar.stop();
  }
}

exports.Bar = Bar;
