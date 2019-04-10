export default function fetchAws(awsAction, payload) {
  return new Promise((resolve, reject) => {
    fetch(process.env.REACT_APP_DEV_API_URL, {
      method: "POST",
      headers: {
        'X-Amz-Target': 'AWSStepFunctions.' + awsAction
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(
        (result) => {
          if (result.error) {
            console.log(result.error);
            reject(result.error);
            return;
          }
          resolve(result);
        },
        reject,
      )
  });
}

function handleError(errorStateHolder, error) {
  console.log(error);
  if (typeof error == "object") {
    let err = "Undefined error";
    if (error["message"] ) {
      err = error["message"];
    }
    error = err;
  }
  errorStateHolder.setState({
    isLoaded: true,
    error
  });
}

export function fetchAwsWithErrorHandling(awsAction, payload, errorStateHolder, successCallback) {
    fetchAws(awsAction, payload).then(
      (result) => {
        let err = successCallback(result);
        if (err) {
          handleError(errorStateHolder, err);
        }
      },
      (error) => {
        handleError(errorStateHolder, error);
      }
    );
}