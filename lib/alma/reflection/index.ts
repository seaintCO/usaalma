export function reflectOnResult(result:any) {
  if (!result) {
    return {
      ok:false,
      message:"ALMA could not complete that action.",
    };
  }

  if (result.type === "image" && result.success && result.outputBase64) {
    return {
      ok:true,
      content:`[ALMA_IMAGE:${result.outputBase64}]`,
    };
  }

  if (result.type === "image" && !result.success) {
    return {
      ok:false,
      message: result.message || "ALMA could not generate the image.",
    };
  }

  return {
    ok:false,
    message:null,
  };
}
