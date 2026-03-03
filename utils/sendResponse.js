export const sendResponse = (res, {
    status= true,
    statusCode = 200,
    message = "Operation Successful",
    data = null,
    error = null
}) => {
    return res.status(statusCode).json({status, message, data, error})
};