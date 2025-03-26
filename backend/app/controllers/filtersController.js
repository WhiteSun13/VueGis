const { SiteType, SiteEpoch, sequelize } = require('@app/models');

exports.getFilters = async (req, res) => {
    try {
      const types = await SiteType.findAll({
        attributes: ['id', 'type_value', 'label']
      });
      const epochs = await SiteEpoch.findAll({
        attributes: ['id', 'epoch_value', 'label']
      });
      res.json({ types, epochs });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  };