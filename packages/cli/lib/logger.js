const cliProgress = require('cli-progress');

function padCenter(str, length, char = ' ') {
  const padLength = length - str.length;
  const padLeft = Math.floor(padLength / 2);
  const padRight = padLength - padLeft;
  return char.repeat(padLeft) + str + char.repeat(padRight);
}

class Bar {
  constructor({ type, total }) {
    const title = padCenter(type, 11);
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
      this.bar.update(total, {
        status: 'Complete',
        message: Date.now() - this.startTime + 'ms',
      });
      this.stop();
    }
  }

  stop() {
    this.multiBar.stop();
  }
}

exports.Bar = Bar;
