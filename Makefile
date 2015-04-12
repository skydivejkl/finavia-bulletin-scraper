
export PATH := node_modules/.bin:$(PATH)

npm:
	npm install


scrape:
	@babel-node index.js


