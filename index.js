const app = require('./src/app');
const { nodeEnv, port } = require('./src/config/env');

app.listen(port, () => {
  console.log(`Server running in ${nodeEnv} mode on port ${port}`);
});
