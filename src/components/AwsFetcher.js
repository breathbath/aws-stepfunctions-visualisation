function fetchAws(awsAction, payload) {
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
        (error) => {
          console.log(error);
          reject(error);
        }
      )
  });
}

export default fetchAws;