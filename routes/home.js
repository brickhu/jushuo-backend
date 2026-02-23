const express = require('express');
const router = express.Router();
const SCHEMA = require('../db/schema')

router.get('/', async (req, res) => {
  try {
    res.status(200).send("ok");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'something error.',
      error: error.message
    });
  }
});

router.post("/test/add",async(req,res)=>{
  const { username } = req.body;
  try {
    const T = SCHEMA.TESTS;
    const fields = T.fields;
    const [id] = await req.db(T.name).insert({
      [fields.USERNAME.name]: username,
    });

    res.status(201).json({ id, message: 'User created' });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'something error.',
      error: error.message
    });
  }
})

// 导出路由
module.exports = router;