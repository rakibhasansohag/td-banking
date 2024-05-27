import React from "react";
import { Control, FieldPath } from "react-hook-form";
import { z } from "zod";

import { FormControl, FormField, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { AuthFormSchema } from "@/lib/utils";

const formSchema = AuthFormSchema("sign-up");

interface CustomInputProps {
  control: Control<z.infer<typeof formSchema>>;
  name: FieldPath<z.infer<typeof formSchema>>;
  label: string;
  placeholder: string;
}

const CustomInput = ({
  control,
  name,
  label,
  placeholder,
}: CustomInputProps) => {
  return (
    <>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <div className="form-item">
            <FormLabel className="form-label">{label}</FormLabel>
            <div className="flex flex-col w-full">
              <FormControl>
                <Input
                  placeholder={placeholder}
                  className="input-class"
                  {...field}
                  type={name === "password" ? "password" : "text"}
                />
              </FormControl>
              <FormMessage className="form-message mt-2" />
            </div>
          </div>
        )}
      />
    </>
  );
};

export default CustomInput;
