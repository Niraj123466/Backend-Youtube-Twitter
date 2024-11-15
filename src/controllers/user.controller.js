import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import { User } from '../models/user.mode.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'

const registerUser = asyncHandler(async function (req, res) {

    // accept the data from the user in body
    const {username, email, fullName, password} = req.body
    if(
        [fullName, username, email, password].some((field) => field?.trim() == "")
    ) {
        throw new ApiError(400, "All field are required")
    }

    // check if the user already exits or not
    const existedUser = await User.findOne({
        $or : [{ email }, { username }]
    })

    if(existedUser) {
        console.log(existedUser)
        throw new ApiError(409, "User already exists with given username or password")
    }

    // take the avatar and coverImage from user
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // make a db entry for avatar image
    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "", 
        username : username,
        email,
        password
    })

    // check if user is created successfully or not
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) {
        throw new ApiError(400, "Unable to create user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created successfully")
    )
})

export {registerUser}