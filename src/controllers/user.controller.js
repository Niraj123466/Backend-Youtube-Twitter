import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import { User } from '../models/user.model.js'
import jwt from 'jsonwebtoken'
import {uploadOnCloudinary} from '../utils/cloudinary.js'


const generateAccessAndRefreshTokens = async(userId) => {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    // store refresh token in db
    user.refreshToken = refreshToken
    user.save({validateBeforeSave : false})

    return {accessToken, refreshToken}
}

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

const loginUser = asyncHandler(async function (req, res) {
    const {username, email, password} = req.body

    if(!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User does not exits")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid crediantial")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
        200,
        {
            user : loggedInUser, accessToken, refreshToken
        },
        "user loggedin successfully"
    ))

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", accessToken, options)
    .clearCookie("refreshToken",refreshToken, options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if(incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Invalid refresh token")
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(200, "Access token refreshed")
    )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPasword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    if(!user) {
        throw new ApiError(403, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPasword)
    if(!isPasswordValid) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {},"password changed successfully") 
    )

})

const getCurrentUser = asyncHandler(function(req, res) {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async function(req, res) {
    const {fullName, email} = req.body
    if(!fullName || !email) {
        throw new ApiError(400, "fullname and email is required to update the user information")
    }

    // const user = req.user;
    // user.fullName = fullName
    // user.email = email
    // await user.save({validateBeforeSave : false})

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,
                email
            }
        },
        {new : true} // update info gets returned
    ).select("-password")

    return res
    .status(200)
    .json(200, updatedUser, "User information updated successfully")
})

const updateUserAvatar = asyncHandler(async function(req, res) {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) {
        throw new ApiError(400, "Unable to find avatar file")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
            new : true // return the updated info
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async function(req, res) {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) {
        throw new ApiError(400, "Unable to cover image")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url) {
        throw new ApiError(400, "Error uploading cover image on cloudinary")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        }
    ).select("-password")

    return res
    .status(200)
    .json(200, updatedUser, "cover image changed successfully")
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword,getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage}