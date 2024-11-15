import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

/*
    How we are going to upload the file
    file => localserver upload  => cloudinary upload
*/

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async function(localFilePath) {
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })

        console.log("File uploaded on cloudinary ", response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        // unlike delete the file from our local server as upload operation failed on cloudinary
        fs.unlinkSync(localFilePath)
    }
}

export {uploadOnCloudinary}