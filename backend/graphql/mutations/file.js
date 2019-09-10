const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const FlakeId = require('flake-idgen')
const intformat = require('biguint-format')

const { GraphQLString } = require('graphql')
const { GraphQLUpload } = require('apollo-upload-server')
const { ForbiddenError } = require('apollo-server-express')

const File = require('../../models/file')
const FileType = require('../types/file')

const flakeIdGen = new FlakeId({ epoch: 1300000000000 })

module.exports = {
  fileCreate: {
    description: 'Add a file',
    type: FileType,
    args: {
      file: {
        type: GraphQLUpload
      }
    },
    async resolve (root, data, { user }) {
      if (!user) {
        throw new ForbiddenError('Unauthorized')
      }
      console.log(user)
      const { createReadStream, mimetype, encoding } = await data.file
      const stream = await createReadStream(data.file) // 生成stream
      const uploadsDir = path.join(__dirname, '../..', 'uploads')
      let filename = intformat(flakeIdGen.next(), 'dec') + '.' + sharp.format.jpeg.id
      console.log('filename flakeId')
      console.log(filename)
      let fullpath = path.join(uploadsDir, filename)
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdir(uploadsDir, function (err) {
          console.log(err)
          if (err) {
            console.log(err)
          } else {
            console.log('creat done!')
          }
        })
      }
      if (fs.existsSync(fullpath)) {
        filename = intformat(flakeIdGen.next(), 'dec') + '.' + sharp.format.jpeg.id
        fullpath = path.join(uploadsDir, filename)
      }
      console.log('filename---------------------------------')
      console.log(filename)
      console.log('fullpath--------------------------')
      console.log(fullpath)
      const writeStream = await fs.createWriteStream(fullpath)
      console.log('writeStream----------------------------')
      console.log(writeStream)
      const pipeline = await sharp()
        .toFormat(sharp.format.jpeg, {
          progressive: true,
          chromaSubsampling: '4:4:4'
        })
        .clone()
        .resize({ fit: 'inside' })
        .pipe(writeStream)

      stream.pipe(pipeline)

      return new File({
        filename,
        mimetype,
        encoding
      }).save()
    }
  },

  fileRemove: {
    type: FileType,
    description: 'Remove file',
    args: {
      id: { type: GraphQLString }
    },
    async resolve (root, { id }) {
      const item = await File.findById(id).exec()
      const filepath = path.join(__dirname, '../..', 'uploads', item.filename)

      fs.unlinkSync(filepath)

      return File.deleteOne({ _id: id }).exec()
    }
  }
}
