module.exports = {
  default: {
    requireModule: ['tsx/cjs', 'tsconfig-paths/register'],
    require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    format: ['progress'],
    paths: ['features/**/*.feature'],
    publishQuiet: true
  }
};
